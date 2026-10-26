import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {
    getFirestore, initializeFirestore, collection, doc, addDoc, getDoc, getDocs, onSnapshot,
    query, where, limit, serverTimestamp, runTransaction, updateDoc, setDoc, deleteDoc
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: 'AIzaSyDCOz1Y4BYuqZ8FNncjhYQg3BamTK6q7lQ',
    authDomain: 'rung-multiplayer-ae58e.firebaseapp.com',
    projectId: 'rung-multiplayer-ae58e',
    storageBucket: 'rung-multiplayer-ae58e.firebasestorage.app',
    messagingSenderId: '1056760440961',
    appId: '1:1056760440961:web:b9164563cf8de369d94580',
    measurementId: 'G-185MNVDQP2'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
let db;
try {
    db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
} catch (e) {
    db = getFirestore(app);
}

const BOT_NAMES = [
    'Aisha', 'Amara', 'Anika', 'Arjun', 'Aya', 'Bao', 'Camila', 'Chidi', 'Dara',
    'Elif', 'Fatima', 'Hana', 'Idris', 'Ines', 'Jin', 'Kai', 'Kofi', 'Leila',
    'Lina', 'Mateo', 'Mina', 'Nadia', 'Noah', 'Ravi', 'Sana', 'Sofia', 'Tariq',
    'Wei', 'Yara', 'Zuri'
];

function generateBotName(usedNames) {
    const available = BOT_NAMES.filter(name => !usedNames.has(name.toLowerCase()));
    const pool = available.length ? available : BOT_NAMES;
    const name = pool[Math.floor(Math.random() * pool.length)];
    usedNames.add(name.toLowerCase());
    return `${name} (Bot)`;
}

const currentUser = new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, user => {
        unsubscribe();
        if (user) {
            resolve(user);
            return;
        }
        signInAnonymously(auth).then(credential => resolve(credential.user), reject);
    }, reject);
});

function rooms() {
    return collection(db, 'rooms');
}

function roomRef(roomId) {
    return doc(db, 'rooms', roomId);
}

function codeValue() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    return [...bytes].map(byte => alphabet[byte % alphabet.length]).join('');
}

async function createRoom(name, visibility, scoringMode = 'classic_3_2') {
    const user = await currentUser;
    const usedBotNames = new Set([name.toLowerCase()]);
    let tableCode = codeValue();
    let codeRef = doc(db, 'inviteCodes', tableCode);
    while ((await getDoc(codeRef)).exists()) {
        tableCode = codeValue();
        codeRef = doc(db, 'inviteCodes', tableCode);
    }
    const inviteCode = visibility === 'private' ? tableCode : null;

    const roomData = {
        hostUid: user.uid,
        hostName: name,
        visibility,
        scoringMode,
        status: 'WAITING',
        tableCode,
        inviteCode: visibility === 'private' ? inviteCode : null,
        allowViewers: visibility === 'public',
        memberUids: [user.uid],
        viewerUids: [],
        seats: [
            { uid: user.uid, name, team: 1, isBot: false },
            { uid: null, name: generateBotName(usedBotNames), team: 2, isBot: true },
            { uid: null, name: generateBotName(usedBotNames), team: 1, isBot: true },
            { uid: null, name: generateBotName(usedBotNames), team: 2, isBot: true }
        ],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        spectatorCount: 0,
        publicState: null
    };
    const room = await addDoc(rooms(), roomData);
    await setDoc(codeRef, { roomId: room.id, createdAt: serverTimestamp() });
    return { id: room.id, ...roomData, inviteCode, tableCode };
}

async function resolveRoomCode(code) {
    const normalizedCode = String(code).trim().toUpperCase();
    const codeSnapshot = await getDoc(doc(db, 'inviteCodes', normalizedCode));
    if (!codeSnapshot.exists()) {
        throw new Error('That invite code was not found.');
    }
    const roomId = codeSnapshot.data().roomId;
    try {
        const roomSnapshot = await getDoc(roomRef(roomId));
        if (!roomSnapshot.exists()) throw new Error('That table is no longer available.');
        return { id: roomSnapshot.id, ...roomSnapshot.data(), inviteCode: normalizedCode };
    } catch (error) {
        if (error.code !== 'permission-denied') throw error;
        return { id: roomId, inviteCode: normalizedCode };
    }
}

async function requestSeat(roomId, name, code = null, playerId = null, preferredSeatIndex = null) {
    const user = await currentUser;
    const requestRef = doc(db, 'rooms', roomId, 'memberRequests', user.uid);
    await setDoc(requestRef, {
        uid: user.uid,
        name,
        playerId,
        role: 'player',
        inviteCode: code,
        preferredSeatIndex: Number.isInteger(preferredSeatIndex) ? preferredSeatIndex : null,
        status: 'pending',
        createdAt: serverTimestamp()
    });
    return requestRef;
}

async function requestViewer(roomId, name) {
    const user = await currentUser;
    const requestRef = doc(db, 'rooms', roomId, 'memberRequests', user.uid);
    await setDoc(requestRef, {
        uid: user.uid,
        name,
        role: 'viewer',
        inviteCode: null,
        status: 'pending',
        createdAt: serverTimestamp()
    });
    return requestRef;
}

async function acceptRequest(roomId, uid, seatIndex = null) {
    const requestRef = doc(db, 'rooms', roomId, 'memberRequests', uid);
    return runTransaction(db, async transaction => {
        const [roomSnapshot, pendingSnapshot] = await Promise.all([
            transaction.get(roomRef(roomId)),
            transaction.get(requestRef)
        ]);
        if (!roomSnapshot.exists() || !pendingSnapshot.exists()) return null;
        const room = roomSnapshot.data();
        const request = pendingSnapshot.data();
        const explicitSeat = Number.isInteger(seatIndex) && seatIndex >= 0 && seatIndex < 4;
        if (request.status !== 'pending' && !(explicitSeat && request.role === 'viewer')) return request;

        const isViewer = !explicitSeat && request.role === 'viewer';
        const chosenSeat = isViewer ? null : Number.isInteger(seatIndex)
            ? seatIndex
            : (Number.isInteger(request.preferredSeatIndex) && room.seats[request.preferredSeatIndex]?.isBot
                ? request.preferredSeatIndex
                : (room.seats[2]?.isBot ? 2 : room.seats.findIndex(seat => seat.isBot)));
        if (!isViewer && (chosenSeat < 0 || !room.seats[chosenSeat]?.isBot)) {
            const rejected = { ...request, status: 'full' };
            transaction.update(requestRef, { status: 'full' });
            return rejected;
        }
        if (isViewer && (!room.allowViewers || room.visibility !== 'public')) {
            transaction.update(requestRef, { status: 'rejected' });
            return { ...request, status: 'rejected' };
        }

        const seats = room.seats.map((seat, index) => index === chosenSeat
            ? { ...seat, uid: request.uid, name: request.name, isBot: false }
            : seat);
        const memberUids = [...new Set([...room.memberUids, request.uid])];
        const viewerUids = isViewer
            ? [...new Set([...(room.viewerUids || []), request.uid])]
            : (room.viewerUids || []).filter(id => id !== request.uid);
        transaction.update(roomRef(roomId), {
            seats,
            memberUids,
            viewerUids,
            spectatorCount: Number(room.spectatorCount || 0) + (isViewer ? 1 : 0),
            updatedAt: serverTimestamp()
        });
        transaction.update(requestRef, {
            status: 'accepted',
            seatIndex: chosenSeat,
            roomStatus: room.status,
            acceptedAt: serverTimestamp()
        });
        return { ...request, role: isViewer ? 'viewer' : 'player', status: 'accepted', seatIndex: chosenSeat, roomStatus: room.status };
    });
}

async function rejectRequest(roomId, uid) {
    await updateDoc(doc(db, 'rooms', roomId, 'memberRequests', uid), {
        status: 'rejected',
        rejectedAt: serverTimestamp()
    });
}

async function submitAction(roomId, seatIndex, card, kind = 'card', senderName = null) {
    const user = await currentUser;
    return addDoc(collection(db, 'rooms', roomId, 'actions'), {
        uid: user.uid,
        seatIndex,
        kind,
        card: kind === 'card' && card ? { suit: card.suit, rank: card.rank } : null,
        reaction: kind === 'reaction' ? String(card || '').slice(0, 80) : null,
        senderName: senderName ? String(senderName).slice(0, 24) : null,
        trumpSuit: kind === 'trump' ? card : null,
        createdAt: serverTimestamp(),
        processed: false
    });
}

async function publishPrivateHands(roomId, players) {
    const hands = players
        .filter(player => player.uid && !player.isBot)
        .map(player => setDoc(doc(db, 'rooms', roomId, 'privateHands', player.uid), {
            uid: player.uid,
            seatIndex: player.id - 1,
            cards: player.cards.map(card => ({ suit: card.suit, rank: card.rank })),
            updatedAt: serverTimestamp()
        }));
    await Promise.all(hands);
}

async function publishRoom(roomId, roomPatch, players, publicState) {
    const updates = {
        ...roomPatch,
        publicState,
        updatedAt: serverTimestamp()
    };
    const roomPromise = updateDoc(roomRef(roomId), updates);
    await Promise.all([roomPromise, publishPrivateHands(roomId, players)]);
}

async function saveHostState(roomId, state) {
    const user = await currentUser;
    await setDoc(doc(db, 'rooms', roomId, 'hostState', user.uid), {
        state,
        updatedAt: serverTimestamp()
    });
}

async function getHostState(roomId) {
    const user = await currentUser;
    const snapshot = await getDoc(doc(db, 'rooms', roomId, 'hostState', user.uid));
    return snapshot.exists() ? snapshot.data().state : null;
}

async function getRoom(roomId) {
    const snapshot = await getDoc(roomRef(roomId));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

async function markActionProcessed(actionRef) {
    await updateDoc(actionRef, { processed: true });
}

async function updateLeaderboard(name, partnerName, courts, awards, won) {
    const user = await currentUser;
    const ref = doc(db, 'leaderboard', user.uid);
    return runTransaction(db, async transaction => {
        const snapshot = await transaction.get(ref);
        const current = snapshot.exists() ? snapshot.data() : {
            gamesPlayed: 0,
            maxCourts: 0,
            awards: [],
            trackedGames: 0,
            wins: 0,
            losses: 0
        };
        const nextAwards = [...new Set([...(current.awards || []), ...awards])];
        const outcome = won === true ? 'win' : won === false ? 'loss' : 'tie';
        const wins = Number(current.wins || 0) + (outcome === 'win' ? 1 : 0);
        const losses = Number(current.losses || 0) + (outcome === 'loss' ? 1 : 0);
        transaction.set(ref, {
            name,
            partnerName: String(partnerName || '').trim().slice(0, 20),
            maxCourts: Math.max(Number(current.maxCourts || 0), courts),
            gamesPlayed: Number(current.gamesPlayed || 0) + 1,
            trackedGames: Number(current.trackedGames || 0) + 1,
            wins,
            losses,
            awards: nextAwards,
            updatedAt: serverTimestamp()
        });
        return { wins, losses };
    });
}

async function getMyLeaderboardEntry() {
    const user = await currentUser;
    const snapshot = await getDoc(doc(db, 'leaderboard', user.uid));
    return snapshot.exists() ? snapshot.data() : null;
}

async function getLeaderboard() {
    const result = await getDocs(query(collection(db, 'leaderboard'), limit(100)));
    return result.docs.map(snapshot => ({ id: snapshot.id, ...snapshot.data() }))
        .sort((a, b) => (b.maxCourts || 0) - (a.maxCourts || 0) || (b.gamesPlayed || 0) - (a.gamesPlayed || 0))
        .slice(0, 20);
}

function listenRoom(roomId, callback, onError) {
    return onSnapshot(roomRef(roomId), snapshot => {
        if (snapshot.exists()) callback({ id: snapshot.id, ...snapshot.data() });
    }, onError);
}

function listenRequests(roomId, callback, onError) {
    return onSnapshot(collection(db, 'rooms', roomId, 'memberRequests'), snapshot => {
        snapshot.docChanges().forEach(change => {
            callback(change.doc, change.type);
        });
    }, onError);
}

function listenActions(roomId, callback, onError) {
    return onSnapshot(query(collection(db, 'rooms', roomId, 'actions'), where('processed', '==', false)), snapshot => {
        snapshot.docChanges().forEach(change => {
            if (change.type === 'added') callback(change.doc);
        });
    }, onError);
}

async function getPrivateHand(roomId, uid) {
    const snapshot = await getDoc(doc(db, 'rooms', roomId, 'privateHands', uid));
    return snapshot.exists() ? snapshot.data() : null;
}

function listenPrivateHand(roomId, uid, callback, onError) {
    return onSnapshot(doc(db, 'rooms', roomId, 'privateHands', uid), snapshot => {
        if (snapshot.exists()) callback(snapshot.data());
    }, onError);
}

function listenMemberRequest(roomId, uid, callback, onError) {
    return onSnapshot(doc(db, 'rooms', roomId, 'memberRequests', uid), snapshot => {
        if (snapshot.exists()) callback(snapshot.data());
    }, onError);
}

async function deleteMemberRequest(roomId, uid) {
    await deleteDoc(doc(db, 'rooms', roomId, 'memberRequests', uid));
}

async function writeVoiceOffer(roomId, fromUid, toUid, offer, sessionId) {
    await addDoc(collection(db, 'rooms', roomId, 'voice'), {
        fromUid, toUid, offer, sessionId, createdAt: serverTimestamp()
    });
}

async function writeVoiceAnswer(roomId, signalId, answer) {
    await updateDoc(doc(db, 'rooms', roomId, 'voice', signalId), {
        answer, updatedAt: serverTimestamp()
    });
}

function listenVoiceSignal(roomId, fromUid, toUid, callback, onError) {
    return onSnapshot(query(
        collection(db, 'rooms', roomId, 'voice'),
        where('toUid', '==', toUid)
    ), snapshot => {
        const latest = snapshot.docs
            .filter(item => item.data().fromUid === fromUid && item.data().sessionId)
            .sort((first, second) => {
                const firstSession = String(first.data().sessionId);
                const secondSession = String(second.data().sessionId);
                return secondSession.localeCompare(firstSession) || second.id.localeCompare(first.id);
            })[0];
        if (latest) callback({ ...latest.data(), signalId: latest.id });
    }, onError);
}

function listenLeaderboard(callback, onError) {
    return onSnapshot(query(collection(db, 'leaderboard'), limit(100)), snapshot => {
        callback(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
            .sort((a, b) => (b.maxCourts || 0) - (a.maxCourts || 0) || (b.gamesPlayed || 0) - (a.gamesPlayed || 0))
            .slice(0, 20));
    }, onError);
}

function listenPublicRooms(callback, onError) {
    return onSnapshot(query(rooms(), where('visibility', '==', 'public'), limit(30)), snapshot => {
        callback(snapshot.docs
            .map(item => ({ id: item.id, ...item.data() }))
            .filter(room => room.status === 'WAITING' || room.status === 'PLAYING')
            .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)));
    }, onError);
}

function listenMyRunningRooms(uid, callback, onError) {
    return onSnapshot(
        query(rooms(), where('memberUids', 'array-contains', uid), limit(30)),
        snapshot => callback(snapshot.docs
            .map(item => ({ id: item.id, ...item.data() }))
            .filter(room => room.status === 'PLAYING' || room.status === 'WAITING')
            .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0))),
        onError
    );
}

window.rungFirebaseReady = currentUser.then(user => {
    window.rungFirebase = {
        user,
        createRoom,
        resolveRoomCode,
        requestSeat,
        requestViewer,
        acceptRequest,
        rejectRequest,
        submitAction,
        publishPrivateHands,
        publishRoom,
        saveHostState,
        getHostState,
        getRoom,
        markActionProcessed,
        updateLeaderboard,
        getMyLeaderboardEntry,
        getLeaderboard,
        listenRoom,
        listenRequests,
        listenActions,
        getPrivateHand,
        listenPrivateHand,
        listenMemberRequest,
        deleteMemberRequest,
        writeVoiceOffer,
        writeVoiceAnswer,
        listenVoiceSignal,
        listenLeaderboard,
        listenPublicRooms,
        listenMyRunningRooms
    };
    window.dispatchEvent(new CustomEvent('rung-firebase-ready'));
    return window.rungFirebase;
});
