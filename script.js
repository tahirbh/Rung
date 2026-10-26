// Game state
const gameState = {
    deck: [],
    players: [
        { id: 1, name: "You", team: 1, cards: [], tricks: 0, isHuman: true },
        { id: 2, name: "Player 2", team: 2, cards: [], tricks: 0, isHuman: false },
        { id: 3, name: "Player 3", team: 1, cards: [], tricks: 0, isHuman: false },
        { id: 4, name: "Player 4", team: 2, cards: [], tricks: 0, isHuman: false }
    ],
    currentPlayer: 0,
    trumpSuit: null,
    trumpChooserId: 1,
    nextTrumpChooserId: 1,
    ledSuit: null,
    trickCards: [],
    trickWinner: null,
    handsPlayed: 0,
    gameState: "SETUP",
    team1Points: 0,
    team2Points: 0,
    team1Consecutive: 0,
    team2Consecutive: 0,
    tableCards: [],
    handIndex: 0,
    handWinners: [],
    stackedPoints: 0,
    currentStake: 1, // 1 or 2
    scoringMode: localStorage.getItem('rung-scoring-mode') || 'classic_3_2',
    consecutiveWins: 0,
    totalHandsPlayed: 0,
    lastWinningTeam: null,
    lastHandWinnerId: null,
    currentChallengeTeam: null,
    stake1Completed: false,
    // Add in gameState: playHistory and per-player history arrays
    playHistory: [],              // chronological list of all plays {playerId, card}
    lastPlayedByPlayer: {         // per-player chronological lists
        1: [], 2: [], 3: [], 4: []
    },
    // new: sequence counter and per-player visual play counts for z-ordering
    playSeqCounter: 0,
    playCountByPlayer: {1:0,2:0,3:0,4:0},
    lastPlayedPlayerId: null,
    lastPlayInfoByPlayer: {1:null,2:null,3:null,4:null},
    botBanter: null,
    botBanterLog: [],
    lastReaction: null,
    customEmojis: [],
    reactionTimer: null,
    announcementTimer: null,
    initialLeadTeam: null,         // new: track if Team 1 has lead since start
    leadHolderPlayerId: null      // which specific player currently holds the lead for the running stack
};

// Card suits and ranks
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const SUIT_SYMBOLS = {'hearts': '♥', 'diamonds': '♦', 'clubs': '♣', 'spades': '♠'};
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_VALUES = { '2': 0, '3': 1, '4': 2, '5': 3, '6': 4, '7': 5, '8': 6, '9': 7, '10': 8, 'J': 9, 'Q': 10, 'K': 11, 'A': 12 };
const ONLINE_TURN_TIMEOUT_MS = 45000;
const MAX_MISSED_TURNS = 6;
const AI_REACTIONS = ['😎', '😅', '🤔', '🔥', '👏', '😮', '😂', '❤️', 'Unlucky!'];
const PUNJABI_BOT_LINES = [
    { text: 'ਸਾਥੀ, ਹੁਣ ਆਪਣੀ ਚਾਲ ਸੋਚ ਸਮਝ ਕੇ ਖੇਡੋ!', cue: 'partner' },
    { text: 'ਵਿਰੋਧੀਓ, ਹਾਲੇ ਬਾਜ਼ੀ ਬਾਕੀ ਹੈ ਜੀ!', cue: 'opponents' },
    { text: 'ਸਾਥੀ, ਰੰਗ ਦਾ ਧਿਆਨ ਰੱਖਣਾ!', cue: 'partner' },
    { text: 'ਓਏ ਹੋਏ, ਇਹ ਪੱਤਾ ਤਾਂ ਕਮਾਲ ਦਾ ਨਿਕਲਿਆ!', cue: 'neutral' },
    { text: 'ਚਲੋ ਜੀ, ਹੁਣ ਵੇਖਦੇ ਹਾਂ ਅਗਲੀ ਚਾਲ!', cue: 'neutral' },
    { text: 'ਸਾਥੀ, ਹੌਸਲਾ ਰੱਖੋ—ਖੇਡ ਹਾਲੇ ਮੁੱਕੀ ਨਹੀਂ!', cue: 'partner' },
    { text: 'ਵਾਹ ਜੀ ਵਾਹ, ਸੋਹਣੀ ਚਾਲ ਸੀ!', cue: 'neutral' },
    { text: 'ਵਿਰੋਧੀਓ, ਹੁਣ ਸਾਡੀ ਵਾਰੀ ਵੇਖੋ!', cue: 'opponents' },
    { text: 'ਸਾਥੀ, ਮੇਰੇ ਇਸ਼ਾਰੇ ਨਾਲ ਖੇਡੋ—ਰੰਗ ਨਾ ਭੁੱਲਿਓ!', cue: 'partner' },
    { text: 'ਹੱਸ ਕੇ ਖੇਡੋ ਜੀ, ਜਿੱਤ ਹਾਲੇ ਕਿਸੇ ਦੀ ਪੱਕੀ ਨਹੀਂ!', cue: 'neutral' }
];
const BOT_NAMES = [
    'Aisha', 'Amara', 'Anika', 'Arjun', 'Aya', 'Bao', 'Camila', 'Chidi', 'Dara',
    'Elif', 'Fatima', 'Hana', 'Idris', 'Ines', 'Jin', 'Kai', 'Kofi', 'Leila',
    'Lina', 'Mateo', 'Mina', 'Nadia', 'Noah', 'Ravi', 'Sana', 'Sofia', 'Tariq',
    'Wei', 'Yara', 'Zuri'
];
let rulesAreOpen = false;
const onlineState = {
    mode: null,
    roomId: null,
    room: null,
    seatIndex: null,
    isHost: false,
    isViewer: false,
    isReplica: false,
    hasStarted: false,
    name: localStorage.getItem('rung-player-name') || '',
    roomUnsubscribe: null,
    requestsUnsubscribe: null,
    actionsUnsubscribe: null,
    handUnsubscribe: null,
    joinRequestUnsubscribe: null,
    leaderboardUnsubscribe: null,
    publicRoomsUnsubscribe: null,
    myRoomsUnsubscribe: null,
    actionQueue: Promise.resolve(),
    turnTimer: null,
    turnTimerKey: null,
    missedTurns: {},
    pendingTrumpChoice: null,
    pendingAction: false,
    activeTrumpPrompt: false,
    gameId: null,
    recordingGameId: null,
    recordingPromise: null,
    endGameResult: null,
    voiceStream: null,
    voiceUnsubscribes: [],
    voicePeers: new Map(),
    publishedGameKey: null,
    lastBotBanterId: null,
    lastReactionId: null,
    pendingRequests: new Map(),
    kickedBotSeats: new Set(),
    reservedPlayerIds: new Map(),
    notifiedRequestKeys: new Set(),
    requestTimer: null,
    pendingRoom: null,
    pendingRoomCode: null,
    pendingRequestAsViewer: false,
    pendingPreferredSeatIndex: null,
    dealCompleted: false
};

const SCORING_MODES = ['single_hand', 'classic_3_2', 'two_plus'];

function scoringModeLabel(mode) {
    switch (mode) {
        case 'single_hand':
            return 'Single Hand = 1 Pt';
        case 'two_plus':
            return '2+ Hands Wins Points';
        case 'classic_3_2':
        default:
            return '1st 3 Hands = 3 Pts, then 2+ Hands';
    }
}

function setScoringMode(mode) {
    if (!SCORING_MODES.includes(mode)) return;
    gameState.scoringMode = mode;
    localStorage.setItem('rung-scoring-mode', mode);
    $(`input[name="startup-scoring-mode"][value="${mode}"]`).prop('checked', true);
    $(`input[name="modal-scoring-mode"][value="${mode}"]`).prop('checked', true);
    $(`input[name="trump-scoring-mode"][value="${mode}"]`).prop('checked', true);
    $('#trump-scoring-options [data-scoring-rule]').each(function() {
        $(this).toggleClass('is-active', $(this).attr('data-scoring-rule') === mode);
    });
    if ($('.game-container').hasClass('is-active')) {
        updateUI();
    }
}

function nextBotName(playerId) {
    const used = new Set(gameState.players
        .filter(player => player.id !== playerId)
        .map(player => player.name.replace(/\s+\(Bot\)$/i, '').toLowerCase()));
    const available = BOT_NAMES.filter(name => !used.has(name.toLowerCase()));
    const pool = available.length ? available : BOT_NAMES;
    return `${pool[Math.floor(Math.random() * pool.length)]} (Bot)`;
}

async function connectApprovedRoom(firebase, roomId, uid) {
    subscribeToRoom(roomId);
    if (!onlineState.isViewer) {
        onlineState.handUnsubscribe?.();
        onlineState.handUnsubscribe = firebase.listenPrivateHand(
            roomId, uid, acceptPrivateHand, error => {
                console.error('Private hand subscription failed:', error);
                showFirebaseError('Unable to load your private hand.');
            });
        firebase.getPrivateHand?.(roomId, uid).then(hand => {
            if (hand) acceptPrivateHand(hand);
        }).catch(() => {});
    }

    const room = await firebase.getRoom(roomId);
    if (!room || onlineState.roomId !== roomId || onlineState.mode !== 'client') return;
    onlineState.room = room;
    const mySeat = (room.seats || []).findIndex(s => s && s.uid === uid && !s.isBot);
    if (mySeat >= 0) {
        onlineState.seatIndex = mySeat;
        onlineState.isViewer = false;
    }
    renderRoomLobby(room);
    if ((room.status === 'PLAYING' || room.status === 'COMPLETED') && room.publicState) {
        showGameScreen();
        acceptPublicGameState(room.publicState, room.seats);
    } else {
        $('#room-lobby-status').text('Seat approved. Waiting for the host to start the game.');
    }
}

// Early-safe helper so initializeGame can call it without ReferenceError
function setStatusMessage(message) {
    if (typeof $ !== 'undefined' && $('#status-message').length) {
        $('#status-message').text(message);
    } else if (typeof console !== 'undefined') {
        // fallback for early calls before DOM ready
        console.log('status:', message);
    }
}

function refreshMyRunningTables() {
    if (onlineState.myRoomsUnsubscribe) onlineState.myRoomsUnsubscribe();
    $('#my-running-tables-list').html('<p>Loading your tables…</p>');
    firebaseApi().then(firebase => {
        onlineState.myRoomsUnsubscribe = firebase.listenMyRunningRooms(firebase.user.uid, rooms => {
            renderMyRunningTables(rooms);
        }, error => {
            console.error('Unable to load your running tables:', error);
            $('#my-running-tables-list').html('<p>Your running tables are temporarily unavailable.</p>');
        });
    }).catch(error => {
        console.error('Unable to connect to your running tables:', error);
        $('#my-running-tables-list').html('<p>Connect to Firebase to find your running tables.</p>');
    });
}

function renderMyRunningTables(rooms) {
    onlineState.myRoomsById = Object.fromEntries(rooms.map(room => [room.id, room]));
    const section = $('.my-running-tables');
    const list = $('#my-running-tables-list').empty();
    if (!rooms.length) {
        section.prop('hidden', true);
        list.append('<p>You do not have a running table to resume.</p>');
        return;
    }
    section.prop('hidden', false);
    rooms.forEach(room => {
        const seat = room.seats.find(item => item.uid === window.rungFirebase?.user.uid);
        const row = $('<div class="public-table-item"></div>');
        row.append($('<div></div>')
            .append($('<strong></strong>').text(`${room.hostName || 'Player'}’s table`))
            .append($('<small></small>').text(seat
                ? `${room.status === 'WAITING' ? 'Waiting for players' : 'Game in progress'} · your seat: ${seat.name}`
                : `${room.status === 'WAITING' ? 'Waiting for players' : 'Game in progress'} · watching`)));
        row.append($('<button type="button" class="lobby-secondary">Resume</button>')
            .attr('data-resume-room', room.id));
        list.append(row);
    });
}

// New: small sleep helper for async delays
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// New: safe scheduler for AI trump selection (avoids ReferenceError if aiSelectTrump is missing)
function scheduleAiSelectTrump(ms = 1500) {
	if (typeof window === 'undefined') {
		// non-browser environment - nothing to do
		return;
	}
	setTimeout(() => {
		try {
			// Always call safe wrapper which will attempt real function then fallback
			safeAiSelectTrump();
		} catch (err) {
			console.error('scheduleAiSelectTrump: error invoking safeAiSelectTrump', err);
		}
	}, ms);
}

// Initialize the game
$(document).ready(function() {
    $('#player-name-input').val(onlineState.name);
    const fallbackLocalId = localStorage.getItem('rung-local-player-id') || `P-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    localStorage.setItem('rung-local-player-id', fallbackLocalId);
    $('#player-id-label').text(`Player ID: ${fallbackLocalId}`);
    if (!$('#join-player-id-input').val()) {
        $('#join-player-id-input').val(fallbackLocalId);
    }

    // 3-Tab Navigation on Landing Page (Home | Hall of Fame | How to Play)
    $('.lobby-tabs').on('click', '[data-lobby-tab]', function() {
        const targetTab = $(this).attr('data-lobby-tab');
        $('.lobby-tab-btn').removeClass('is-active').attr('aria-selected', 'false');
        $(this).addClass('is-active').attr('aria-selected', 'true');
        $('.lobby-tab-panel').removeClass('is-active').prop('hidden', true);
        const panelMap = {
            home: '#lobby-tab-home',
            hall: '#lobby-tab-hall',
            rules: '#lobby-tab-rules'
        };
        const panelSelector = panelMap[targetTab] || '#lobby-tab-home';
        $(panelSelector).addClass('is-active').prop('hidden', false);
        if (targetTab === 'hall') {
            refreshHallOfFame();
        }
    });

    // Copy Player ID button
    $('#copy-player-id-btn').on('click', async function() {
        const rawText = $('#player-id-label').text().replace(/^Player ID:\s*/i, '').trim();
        if (!rawText) return;
        try {
            await navigator.clipboard.writeText(rawText);
            const btn = $(this);
            btn.text('Copied!');
            setTimeout(() => btn.text('Copy ID'), 1600);
        } catch (err) {
            console.warn('Clipboard copy failed:', err);
        }
    });

    // Host Pre-Approve Friend by Player ID
    $('#host-preapprove-friend-btn').on('click', async function() {
        const friendPid = String($('#host-friend-player-id').val() || '').trim().toUpperCase();
        const seatIdx = Number($('#host-friend-seat-select').val() ?? 2);
        if (!Number.isInteger(seatIdx) || seatIdx < 1 || seatIdx > 3) return;
        if (friendPid) {
            onlineState.reservedPlayerIds.set(friendPid, seatIdx);
        }
        await kickBotForFriend(seatIdx);
        if (friendPid) {
            const code = onlineState.room?.tableCode || onlineState.room?.inviteCode || '';
            const msg = `Bot kicked from Seat ${seatIdx + 1} and reserved for Player ID ${friendPid}! Share Table ID ${code} with your friend.`;
            $('#room-lobby-status').removeClass('is-error').text(msg);
            setStatusMessage(msg);
        }
    });

    $('#enter-lobby-btn').on('click', showHallOfFame);
    $('#refresh-rankings-btn').on('click', refreshHallOfFame);
    $('#refresh-tables-btn').on('click', refreshPublicTables);
    $('#refresh-my-tables-btn').on('click', refreshMyRunningTables);
    $('#player-name-input').on('change', function() {
        const name = normalizePlayerName($(this).val());
        onlineState.name = name;
        localStorage.setItem('rung-player-name', name);
        $(this).val(name);
    });
    $('#play-solo-btn').on('click', playSoloGame);
    $('#play-random-btn').on('click', playRandomTable);
    $('#create-table-btn').on('click', () => {
        setScoringMode(gameState.scoringMode);
        $('#create-table-modal').prop('hidden', false);
    });
    $('#cancel-create-table-btn').on('click', () => $('#create-table-modal').prop('hidden', true));
    $('#create-table-form').on('submit', createTableFromForm);
    $('#join-table-form').on('submit', joinTableFromCode);
    $('input[name="startup-scoring-mode"], input[name="modal-scoring-mode"], input[name="trump-scoring-mode"]').on('change', function() {
        setScoringMode($(this).val());
    });
    $('#trump-scoring-options').on('click', '[data-scoring-rule]', function() {
        setScoringMode($(this).attr('data-scoring-rule'));
    });
    setScoringMode(gameState.scoringMode);
    $('#public-tables-list').on('click', '[data-join-room]', function() {
        const roomId = $(this).attr('data-join-room');
        const seatAttr = $(this).attr('data-preferred-seat');
        const preferredSeat = seatAttr !== undefined && seatAttr !== '' ? Number(seatAttr) : null;
        joinPublicRoom(roomId, preferredSeat);
    });
    $('#public-tables-list').on('click', '[data-watch-room]', function() {
        watchPublicRoom($(this).attr('data-watch-room'));
    });
    $('#my-running-tables-list').on('click', '[data-resume-room]', function() {
        resumeRunningRoom($(this).attr('data-resume-room'));
    });
    $('#close-room-lobby-btn').on('click', leaveRoomLobby);
    $('#start-table-btn').on('click', startOnlineGame);
    $('#copy-invite-code-btn').on('click', copyInviteCode);
    $('#join-as-viewer-btn').on('click', joinCurrentRoomAsViewer);
    $('#retry-room-request-btn').on('click', retryRoomRequest);
    $('#cancel-room-request-btn').on('click', cancelRoomRequest);
    $('#room-requests-list').on('click', '[data-approve-request]', approveRoomRequest);
    $('#room-requests-list').on('click', '[data-reject-request]', rejectRoomRequest);
    $('#room-seat-list').on('click', '[data-kick-bot-seat]', function() {
        kickBotForFriend(Number($(this).attr('data-kick-bot-seat')));
    });
    $('#room-seat-list').on('click', '[data-kick-human-seat]', function() {
        kickHumanPlayerToBot(Number($(this).attr('data-kick-human-seat')));
    });
    $('#host-join-notice-open').on('click', () => {
        $('#host-join-notice').prop('hidden', true);
        if (onlineState.isHost && onlineState.room) showRoomLobby(onlineState.room);
    });
    $('#host-join-notice-dismiss').on('click', () => $('#host-join-notice').prop('hidden', true));
    $('#enable-host-notifications').on('click', enableHostNotifications);
    $('#lobby-btn').on('click', returnToLobby);
    $('#table-admin-btn').on('click', () => {
        if (onlineState.isHost && onlineState.room) showRoomLobby(onlineState.room);
    });
    $('#top-kick-bot-btn').on('click', () => {
        if (onlineState.isHost && onlineState.room) {
            showRoomLobby(onlineState.room);
        } else {
            kickBotForFriend(2);
        }
    });
    $('#live-table-badge').on('click', copyInviteCode);
    $('#viewer-take-seat-btn').on('click', requestBotSeatFromViewer);
    $('.game-table').on('click', '.inline-kick-bot-btn, [data-inline-kick-bot]', async function(event) {
        event.stopPropagation();
        const seatIndex = Number($(this).attr('data-kick-bot-seat') ?? $(this).attr('data-inline-kick-bot'));
        if (!Number.isInteger(seatIndex)) return;
        await kickBotForFriend(seatIndex);
        if (onlineState.isHost && onlineState.room) {
            showRoomLobby(onlineState.room);
        }
    });
    $('#voice-toggle-btn').on('click', toggleVoice);
    $('#punjabi-voice-toggle').prop(
        'checked',
        localStorage.getItem('rung-punjabi-voice-enabled') !== 'false'
    ).on('change', function() {
        localStorage.setItem('rung-punjabi-voice-enabled', String(this.checked));
    });
    $('#download-banter-btn').on('click', downloadPunjabiBanter);
    window.addEventListener('rung-firebase-ready', () => {
        $('#firebase-status').text('Connected to Firebase. Opening Hall of Fame…');
        window.rungFirebaseReady.then(firebase => {
            const pid = `P-${firebase.user.uid.slice(0, 8).toUpperCase()}`;
            localStorage.setItem('rung-local-player-id', pid);
            $('#player-id-label').text(`Player ID: ${pid}`);
            $('#join-player-id-input').val(pid);
        }).catch(error => {
            console.error('Loading player ID failed:', error);
        });
        refreshHallOfFame();
        refreshPublicTables();
        refreshMyRunningTables();
        setTimeout(() => {
            const stillOnSplash = !$('#splash-screen').prop('hidden');
            const gameIsActive = $('.game-container').hasClass('is-active');
            const roomLobbyIsOpen = !$('#room-lobby').prop('hidden');
            if (stillOnSplash && !gameIsActive && !roomLobbyIsOpen) showHallOfFame();
        }, 900);
    });
    window.rungFirebaseReady?.catch(error => {
        console.error('Firebase initialization failed:', error);
        showFirebaseError('Unable to connect to Firebase. Check the project configuration and try again.');
    });

    $('#new-game-btn').click(function() {
        if (!prepareNewGame()) return;
        rulesAreOpen = false;
        $('#celebration').hide();
        (async () => {
			try {
				await initializeGame();
			} catch (err) {
				console.error('initializeGame (new game) failed:', err);
				setStatusMessage('Error starting new game - check console');
			}
		})();
    });
    $('#play-again-btn').click(function() {
        if (rulesAreOpen) {
            closeRules();
            return;
        }
        if (onlineState.isReplica && !onlineState.isViewer && onlineState.roomId) {
            rulesAreOpen = false;
            $('#celebration').hide();
            setStatusMessage('Starting rematch with partner…');
            firebaseApi().then(firebase =>
                firebase.submitAction(onlineState.roomId, onlineState.seatIndex, '__REMATCH__', 'reaction', currentPlayerName())
            ).catch(err => console.error('Rematch request failed:', err));
            return;
        }
        if (!prepareNewGame()) return;
        rulesAreOpen = false;
        $('#celebration').hide();
        (async () => {
			try {
				await initializeGame();
			} catch (err) {
				console.error('initializeGame (play again) failed:', err);
				setStatusMessage('Error starting new game - check console');
			}
		})();
    });
    $('#end-game-btn').on('click', endMatchToLobby);
    $('#rules-btn').on('click', showRules);

    $('#chat-toggle-btn').on('click', function() {
        const picker = $('#chat-picker');
        picker.prop('hidden', !picker.prop('hidden'));
        $(this).attr('aria-expanded', String(!picker.prop('hidden')));
    });
    $('#chat-close-btn').on('click', closeReactionPicker);
    $('#chat-picker').on('click', '.reaction-choice', function() {
        broadcastReaction($(this).attr('data-reaction'));
    });
    $('#custom-emoji-form').on('submit', function(event) {
        event.preventDefault();
        const emoji = $('#custom-emoji-input').val().trim();
        if (!emoji) return;
        if (!gameState.customEmojis.includes(emoji)) {
            gameState.customEmojis.push(emoji);
            renderCustomEmojis();
        }
        $('#custom-emoji-input').val('');
    });
    $('#custom-message-form').on('submit', function(event) {
        event.preventDefault();
        const message = $('#custom-message-input').val().trim();
        if (!message) return;
        broadcastReaction(message);
        $('#custom-message-input').val('');
    });
});

function normalizePlayerName(value) {
    const name = String(value || '').trim().replace(/\s+/g, ' ').slice(0, 20);
    return name || `Player ${Math.floor(Math.random() * 9000) + 1000}`;
}

function showFirebaseError(message) {
    $('#firebase-status').text(message).addClass('is-error');
    $('#room-lobby-status').text(message).addClass('is-error');
}

async function firebaseApi() {
    if (!window.rungFirebaseReady) {
        throw new Error('Firebase client module is not loaded.');
    }
    return window.rungFirebaseReady;
}

function openTrumpSelection() {
    if (gameState.gameState !== 'TRUMP_SELECTION' ||
        !$('.game-container').hasClass('is-active')) return;
    $('#celebration').hide();
    const preview = $('#trump-hand-preview').empty();
    const localIdx = getLocalPerspectiveSeatIndex();
    const chooser = gameState.players.find(p => p.id === gameState.trumpChooserId) || gameState.players[localIdx];
    const cardsToShow = (chooser && chooser.cards && chooser.cards.length && chooser.cards[0].suit !== 'hidden')
        ? chooser.cards
        : (gameState.players[localIdx]?.cards || []);
    cardsToShow.forEach(card => {
        if (!card || card.suit === 'hidden') return;
        const symbol = SUIT_SYMBOLS[card.suit] || '';
        const colorClass = (card.suit === 'hearts' || card.suit === 'diamonds') ? 'suit-red' : 'suit-black';
        const pill = $('<div class="trump-preview-card"></div>')
            .append($(`<span class="trump-preview-rank ${colorClass}"></span>`).text(card.rank))
            .append($(`<span class="trump-preview-suit ${colorClass}"></span>`).text(symbol));
        preview.append(pill);
    });
    $('#trump-selection').addClass('is-visible').attr('aria-hidden', 'false');
    $('.game-table').addClass('is-trump-selection');
}

function closeTrumpSelection() {
    $('#trump-selection').removeClass('is-visible').attr('aria-hidden', 'true');
    $('.game-table').removeClass('is-trump-selection');
}

function getLocalPerspectiveSeatIndex() {
    return onlineState.isReplica && Number.isInteger(onlineState.seatIndex)
        ? onlineState.seatIndex
        : 0;
}

function getDisplayTeamNumber(team) {
    return gameState.players[getLocalPerspectiveSeatIndex()]?.team === team ? 1 : 2;
}

function getCanonicalSeatIndex(displaySlot) {
    return (getLocalPerspectiveSeatIndex() + displaySlot) % gameState.players.length;
}

function getDisplaySeatIndex(canonicalSeatIndex) {
    return (canonicalSeatIndex - getLocalPerspectiveSeatIndex() + gameState.players.length) %
        gameState.players.length;
}

async function showHallOfFame() {
    closeTrumpSelection();
    $('#rung-app').addClass('is-screen-visible');
    $('#splash-screen').prop('hidden', true);
    $('#lobby-screen').prop('hidden', false);
    $('.game-container').removeClass('is-active');
    try {
        await firebaseApi();
        refreshHallOfFame();
        refreshPublicTables();
        refreshMyRunningTables();
    } catch (error) {
        console.error('Unable to open the Rung lobby:', error);
        showFirebaseError(error.message);
    }
}

async function refreshHallOfFame() {
    try {
        const firebase = await firebaseApi();
        $('#hall-of-fame-body').html('<tr><td colspan="8">Loading rankings…</td></tr>');
        const rankings = await firebase.getLeaderboard();
        renderHallOfFame(rankings);
    } catch (error) {
        console.error('Unable to load Hall of Fame:', error);
        $('#hall-of-fame-body').html('<tr><td colspan="8">Rankings are temporarily unavailable.</td></tr>');
    }
}

function renderHallOfFame(rankings) {
    const body = $('#hall-of-fame-body').empty();
    if (!rankings.length) {
        body.append('<tr><td colspan="8">No champions yet. Finish a game to claim the first spot.</td></tr>');
        return;
    }
    rankings.forEach((entry, index) => {
        const awards = (entry.awards || []).map(award => {
            const icons = { court: '🏆', goohn: '👑', wins: '⭐' };
            return icons[award] || '';
        }).join(' ');
        const row = $('<tr></tr>');
        const displayName = entry.name || 'Player';
        const initials = displayName.trim().split(/\s+/).slice(0, 2)
            .map(part => part.charAt(0).toUpperCase()).join('');
        const playerCell = $('<td class="ranking-player-cell"></td>')
            .append($('<span class="ranking-place"></span>').text(index + 1))
            .append($('<span class="ranking-avatar" aria-hidden="true"></span>').text(initials || 'P'))
            .append($('<span class="ranking-player-name"></span>').text(displayName));
        row.append(playerCell);
        row.append($('<td class="partner-name"></td>').text(entry.partnerName || '—'));
        row.append($('<td></td>').text(Number(entry.maxCourts || 0)));
        const hasTrackedGames = Number(entry.trackedGames || 0) > 0;
        row.append($('<td></td>').text(hasTrackedGames ? Number(entry.wins || 0) : '—'));
        row.append($('<td></td>').text(hasTrackedGames ? Number(entry.losses || 0) : '—'));
        row.append($('<td class="win-loss-ratio"></td>').text(hasTrackedGames
            ? `${Number(entry.wins || 0)}:${Number(entry.losses || 0)}`
            : '—'));
        row.append($('<td class="award-icons"></td>').text(awards || '—'));
        row.append($('<td></td>').text(Number(entry.gamesPlayed || 0)));
        body.append(row);
    });
}

function maybeSpeakPunjabiBotLine(player) {
    if (!player?.isBot || Math.random() > 0.45) return;
    const line = PUNJABI_BOT_LINES[Math.floor(Math.random() * PUNJABI_BOT_LINES.length)];
    const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        playerName: player.name,
        text: line.text,
        createdAt: new Date().toISOString()
    };
    gameState.botBanter = entry;
    gameState.botBanterLog.push(entry);
    gameState.botBanterLog = gameState.botBanterLog.slice(-100);
    renderPunjabiBanter(entry);
}

function renderPunjabiBanter(entry) {
    if (!entry || entry.id === onlineState.lastBotBanterId) return;
    onlineState.lastBotBanterId = entry.id;
    gameState.botBanterLog ||= [];
    if (!gameState.botBanterLog.some(item => item.id === entry.id)) {
        gameState.botBanterLog.push(entry);
        gameState.botBanterLog = gameState.botBanterLog.slice(-100);
    }

    const log = $('#bot-banter-log');
    if (log.length) {
        const time = new Date(entry.createdAt || Date.now()).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
        log.find('.bot-banter-empty').remove();
        log.append(
            $('<p class="bot-banter-entry"></p>')
                .append($('<time></time>').text(time))
                .append($('<strong></strong>').text(entry.playerName || 'Bot'))
                .append(document.createTextNode(`: ${entry.text}`))
        );
        log.scrollTop(log[0].scrollHeight);
    }

    if ($('#punjabi-voice-toggle').prop('checked') && 'speechSynthesis' in window) {
        try {
            const utterance = new SpeechSynthesisUtterance(entry.text);
            utterance.lang = 'pa-IN';
            utterance.rate = 0.92;
            utterance.pitch = 1;
            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.error('Punjabi table-talk speech could not be played:', error);
        }
    }
}

function downloadPunjabiBanter() {
    const lines = gameState.botBanterLog.map(entry => {
        const time = new Date(entry.createdAt).toLocaleString();
        return `[${time}] ${entry.playerName}: ${entry.text}`;
    });
    if (!lines.length) {
        setStatusMessage('There is no bot talk transcript to save yet.');
        return;
    }
    const transcript = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(transcript);
    const download = document.createElement('a');
    download.href = url;
    download.download = `rung-punjabi-table-talk-${new Date().toISOString().slice(0, 10)}.txt`;
    download.click();
    URL.revokeObjectURL(url);
}

function clearRoomSubscriptions() {
    [
        'roomUnsubscribe', 'requestsUnsubscribe', 'actionsUnsubscribe',
        'handUnsubscribe', 'joinRequestUnsubscribe', 'leaderboardUnsubscribe',
        'publicRoomsUnsubscribe', 'myRoomsUnsubscribe'
    ].forEach(key => {
        if (typeof onlineState[key] === 'function') onlineState[key]();
        onlineState[key] = null;
    });
    clearTimeout(onlineState.turnTimer);
    onlineState.turnTimer = null;
    onlineState.turnTimerKey = null;
    onlineState.pendingTrumpChoice = null;
    clearInterval(onlineState.requestTimer);
    onlineState.requestTimer = null;
}

function refreshPublicTables() {
    if (onlineState.publicRoomsUnsubscribe) onlineState.publicRoomsUnsubscribe();
    $('#public-tables-list').html('<p>Loading public tables…</p>');
    firebaseApi().then(firebase => {
        onlineState.publicRoomsUnsubscribe = firebase.listenPublicRooms(rooms => {
            onlineState.publicRoomsById = Object.fromEntries(rooms.map(room => [room.id, room]));
            renderPublicTables(rooms);
        }, error => {
            console.error('Unable to load public tables:', error);
            $('#public-tables-list').html('<p>Public tables are temporarily unavailable.</p>');
        });
    }).catch(error => {
        console.error('Unable to connect to public tables:', error);
        $('#public-tables-list').html('<p>Connect to Firebase to see public tables.</p>');
    });
}

function renderPublicTables(rooms) {
    const list = $('#public-tables-list').empty();
    if (!rooms.length) {
        list.append('<p>No public tables are open yet. Start one with Play Random or Create Table.</p>');
        return;
    }
    rooms.forEach(room => {
        const seats = Array.isArray(room.seats) ? room.seats : [];
        const humanSeats = seats.filter(seat => !seat.isBot).length;
        const vacantSeats = seats
            .map((seat, index) => ({ seat, index }))
            .filter(({ seat }) => seat.isBot);
        const partnerSeatBot = Boolean(seats[2]?.isBot);
        const status = room.status === 'PLAYING' ? 'LIVE GAME' : 'WAITING';
        const tableCode = room.tableCode || room.inviteCode || 'Unavailable';
        const ruleMode = room.publicState?.scoringMode || room.scoringMode || 'classic_3_2';
        const handsPlayed = room.publicState?.totalHandsPlayed ?? 0;
        const scoreSummary = room.status === 'PLAYING' && room.publicState
            ? ` · Hand ${handsPlayed}/13 · Score ${room.publicState.team1Points || 0}-${room.publicState.team2Points || 0}`
            : '';
        const row = $('<div class="public-table-item"></div>');
        row.append($('<div></div>')
            .append($('<strong></strong>').text(`${room.hostName || 'Player'}’s table (${status})`))
            .append($('<small></small>').text(
                `Table ID: ${tableCode}${scoreSummary} · Rule: ${scoringModeLabel(ruleMode)} · ${humanSeats}/4 human · ` +
                `${vacantSeats.length ? `Bot seats open: ${vacantSeats.map(({ index }) => index === 2 ? 'Seat 3 (Partner)' : `Seat ${index + 1}`).join(', ')}` : 'Full (4/4 humans)'} · ` +
                `${Number(room.spectatorCount || 0)} watching`)));
        const actions = $('<div class="public-table-actions"></div>');
        if (vacantSeats.length && (room.status === 'WAITING' || room.status === 'PLAYING')) {
            if (partnerSeatBot) {
                actions.append($('<button type="button" class="lobby-primary">Partner Host (Seat 3)</button>')
                    .attr('data-join-room', room.id)
                    .attr('data-preferred-seat', '2'));
            }
            actions.append($('<button type="button" class="lobby-secondary"></button>')
                .text(room.status === 'PLAYING' ? 'Replace Bot (Play Live)' : 'Take Bot Seat')
                .attr('data-join-room', room.id));
        } else if (room.status === 'WAITING') {
            actions.append($('<span class="room-request-note"></span>').text('Table is full'));
        }
        if (room.allowViewers !== false) {
            actions.append($('<button type="button" class="lobby-secondary">Watch Live</button>')
                .attr('data-watch-room', room.id));
        }
        row.append(actions);
        list.append(row);
    });
}

function currentPlayerName() {
    const name = normalizePlayerName($('#player-name-input').val() || onlineState.name);
    onlineState.name = name;
    $('#player-name-input').val(name);
    localStorage.setItem('rung-player-name', name);
    return name;
}

function isFreshPublicRoom(room) {
    return Boolean(room && (room.status === 'WAITING' || room.status === 'PLAYING'));
}

async function playSoloGame() {
    clearRoomSubscriptions();
    if (onlineState.voiceStream) await toggleVoice();
    onlineState.mode = null;
    onlineState.roomId = null;
    onlineState.room = null;
    onlineState.seatIndex = 0;
    onlineState.isHost = false;
    onlineState.isViewer = false;
    onlineState.isReplica = false;
    onlineState.hasStarted = false;
    onlineState.pendingAction = false;
    onlineState.activeTrumpPrompt = false;
    const rawName = String($('#player-name-input').val() || onlineState.name || '').trim();
    gameState.players[0].name = rawName ? normalizePlayerName(rawName) : 'You';
    gameState.players[0].uid = null;
    gameState.players[0].isHuman = true;
    gameState.players[0].isBot = false;
    gameState.players.slice(1).forEach(player => {
        player.uid = null;
        player.isHuman = false;
        player.isBot = true;
    });
    showGameScreen();
    await initializeGame();
}

async function playRandomTable() {
    try {
        const firebase = await firebaseApi();
        const rooms = Object.values(onlineState.publicRoomsById || {});
        const candidate = rooms.find(room => room.hostUid !== firebase.user.uid &&
            !room.seats.some(seat => seat.uid === firebase.user.uid) &&
            room.seats.some(seat => seat.isBot) &&
            isFreshPublicRoom(room));
        if (candidate) {
            const preferredSeat = candidate.seats?.[2]?.isBot ? 2 : null;
            await joinCloudRoom(candidate, null, currentPlayerName(), false, preferredSeat);
            return;
        }
        const room = await firebase.createRoom(currentPlayerName(), 'public', gameState.scoringMode);
        configureHostRoom(room);
        showGameScreen();
        await startOnlineGame();
    } catch (error) {
        console.error('Play Random failed:', error);
        showFirebaseError(error.message || 'Could not find or create a table.');
    }
}

async function createTableFromForm(event) {
    event.preventDefault();
    $('#create-table-error').text('');
    try {
        const visibility = $('input[name="table-visibility"]:checked').val();
        const selectedRule = $('input[name="modal-scoring-mode"]:checked').val() || gameState.scoringMode;
        setScoringMode(selectedRule);
        const room = await (await firebaseApi()).createRoom(currentPlayerName(), visibility, gameState.scoringMode);
        $('#create-table-modal').prop('hidden', true);
        configureHostRoom(room);
        showRoomLobby(room);
    } catch (error) {
        console.error('Creating a table failed:', error);
        $('#create-table-error').text(error.message || 'Unable to create the table.');
    }
}

async function joinTableFromCode(event) {
    event.preventDefault();
    const code = $('#invite-code-input').val().trim().toUpperCase();
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) {
        showFirebaseError('Enter the 6-character invite code.');
        return;
    }
    const roleChoice = $('#join-code-role').val() || 'partner';
    const asViewer = roleChoice === 'viewer';
    const preferredSeatIndex = roleChoice === 'partner' ? 2 : null;
    try {
        const firebase = await firebaseApi();
        const room = await firebase.resolveRoomCode(code);
        await joinCloudRoom(room, code, currentPlayerName(), asViewer, preferredSeatIndex);
        $('#invite-code-input').val('');
    } catch (error) {
        console.error('Joining by invite code failed:', error);
        showFirebaseError(error.message || 'Could not join that table.');
    }
}

async function joinPublicRoom(roomId, preferredSeatIndex = null) {
    const room = onlineState.publicRoomsById?.[roomId];
    if (!room) {
        showFirebaseError('That table is no longer available.');
        return;
    }
    try {
        await joinCloudRoom(room, null, currentPlayerName(), false, preferredSeatIndex);
    } catch (error) {
        console.error('Joining public table failed:', error);
        showFirebaseError(error.message || 'Could not join that table.');
    }
}

async function watchPublicRoom(roomId) {
    const room = onlineState.publicRoomsById?.[roomId];
    if (!room) {
        showFirebaseError('That table is no longer available.');
        return;
    }
    await joinCloudRoom(room, null, currentPlayerName(), true);
}

async function requestBotSeatFromViewer() {
    const room = onlineState.room || onlineState.publicRoomsById?.[onlineState.roomId];
    if (!room) {
        setStatusMessage('Table information is not available right now.');
        return;
    }
    const partnerOpen = Boolean(room.seats?.[2]?.isBot);
    const anyBotOpen = Boolean(room.seats?.some(seat => seat.isBot));
    if (!anyBotOpen) {
        setStatusMessage('All 4 seats are currently occupied by human players.');
        return;
    }
    try {
        await joinCloudRoom(room, room.inviteCode || room.tableCode || null, currentPlayerName(), false, partnerOpen ? 2 : null);
    } catch (error) {
        console.error('Requesting a bot seat from viewer mode failed:', error);
        setStatusMessage(error.message || 'Could not request the bot seat.');
    }
}

async function resumeRunningRoom(roomId) {
    const room = onlineState.myRoomsById?.[roomId] || onlineState.publicRoomsById?.[roomId];
    if (!room) {
        showFirebaseError('That running table is no longer available. Refresh and try again.');
        return;
    }
    try {
        await joinCloudRoom(room, room.inviteCode || null, currentPlayerName(), false);
    } catch (error) {
        console.error('Resuming the running table failed:', error);
        showFirebaseError(error.message || 'Could not resume that table.');
    }
}

async function joinCloudRoom(room, code, name, asViewer, preferredSeatIndex = null) {
    const firebase = await firebaseApi();
    const existingSeat = room.seats?.findIndex(seat => seat && seat.uid === firebase.user.uid && !seat.isBot) ?? -1;
    const wasViewer = (room.viewerUids || []).includes(firebase.user.uid);
    if (existingSeat >= 0 || (wasViewer && asViewer)) {
        if (room.hostUid === firebase.user.uid) {
            await resumeHostRoom(room);
            return;
        }
        resumeCloudRoom(room, existingSeat, existingSeat >= 0 ? false : Boolean(asViewer));
        return;
    }

    clearRoomSubscriptions();
    onlineState.mode = asViewer ? 'client' : 'joining';
    onlineState.roomId = room.id;
    onlineState.room = room;
    onlineState.isHost = false;
    onlineState.isViewer = asViewer;
    onlineState.isReplica = asViewer;
    onlineState.pendingRoom = room;
    onlineState.pendingRoomCode = code;
    onlineState.pendingRequestAsViewer = asViewer;
    onlineState.pendingPreferredSeatIndex = Number.isInteger(preferredSeatIndex) ? preferredSeatIndex : null;

    if (asViewer) {
        // Immediately let global viewers watch live games while registering viewer request in the background
        firebase.requestViewer(room.id, name).catch(err => console.warn('Viewer registration note:', err));
        subscribeToRoom(room.id);
        $('#room-lobby').prop('hidden', true);
        if ((room.status === 'PLAYING' || room.status === 'COMPLETED') && room.publicState) {
            showGameScreen();
            acceptPublicGameState(room.publicState, room.seats);
            setStatusMessage(`Watching ${room.hostName || 'Player'}’s live game. You can send reactions or take an open bot seat anytime!`);
        } else {
            showRoomLobby(room);
            $('#room-lobby-status').removeClass('is-error').text('Watching table lobby · game will appear automatically when started.');
        }
        return;
    }

    const seatLabel = preferredSeatIndex === 2 ? 'Seat 3 (Host Partner)' : 'an open Bot Seat';
    $('#room-lobby-title').text(`Requesting ${seatLabel}…`);
    $('#room-lobby-description').text('Your request is being sent to the table host to replace a bot and continue the game.');
    $('#room-lobby-status').removeClass('is-error').text('Sending your request…');
    $('#room-invite-code, #copy-invite-code-btn, #start-table-btn').prop('hidden', true);
    $('#join-as-viewer-btn').prop('hidden', true);
    $('#retry-room-request-btn').prop('hidden', true);
    $('#cancel-room-request-btn').prop('hidden', false);
    $('#room-lobby').prop('hidden', false);

    try {
        const customPid = String($('#join-player-id-input').val() || '').trim().toUpperCase();
        const playerId = customPid || `P-${firebase.user.uid.slice(0, 8).toUpperCase()}`;
        $('#player-id-label').text(`Player ID: ${playerId}`);
        $('#join-player-id-input').val(playerId);
        await firebase.requestSeat(
            room.id,
            name,
            code || room.inviteCode || room.tableCode || null,
            playerId,
            onlineState.pendingPreferredSeatIndex
        );
        startApprovalCountdown();
        onlineState.joinRequestUnsubscribe = firebase.listenMemberRequest(
            room.id,
            firebase.user.uid,
            request => {
                if (request.status === 'accepted') {
                    const hasPlayerSeat = Number.isInteger(request.seatIndex) && request.seatIndex >= 0;
                    if (!asViewer && request.role === 'viewer' && !hasPlayerSeat) {
                        return;
                    }
                    onlineState.seatIndex = hasPlayerSeat ? request.seatIndex : null;
                    onlineState.isViewer = hasPlayerSeat ? false : (request.role === 'viewer');
                    onlineState.isReplica = true;
                    onlineState.mode = 'client';
                    onlineState.joinRequestUnsubscribe?.();
                    onlineState.joinRequestUnsubscribe = null;
                    clearInterval(onlineState.requestTimer);
                    onlineState.requestTimer = null;
                    $('#cancel-room-request-btn, #retry-room-request-btn').prop('hidden', true);
                    $('#room-lobby-status').text(onlineState.isViewer
                        ? 'Viewer connected. You can watch the table.'
                        : `Seat ${request.seatIndex + 1} approved! Joining live game with the bot's cards…`);
                    connectApprovedRoom(firebase, room.id, firebase.user.uid)
                        .catch(error => {
                            console.error('Loading the approved table failed:', error);
                            showFirebaseError('Your seat was approved, but the live table could not be loaded. Retry or refresh the table.');
                        });
                } else if (request.status === 'full' || request.status === 'rejected') {
                    clearInterval(onlineState.requestTimer);
                    onlineState.requestTimer = null;
                    onlineState.joinRequestUnsubscribe?.();
                    onlineState.joinRequestUnsubscribe = null;
                    $('#room-lobby-status').addClass('is-error').text(
                        request.status === 'full' ? 'No bot seat is available to replace.' :
                            (asViewer ? 'This table does not allow viewers.' : 'The host declined your request.'));
                    $('#retry-room-request-btn').prop('hidden', request.status !== 'rejected');
                    $('#cancel-room-request-btn').prop('hidden', false);
                }
            },
            error => {
                console.error('Unable to check table-join request:', error);
                showFirebaseError('The table host could not be reached.');
            }
        );
    } catch (error) {
        console.error('Table join request failed:', error);
        $('#room-lobby-status').addClass('is-error').text(error.message || 'Could not request a seat.');
        throw error;
    }
}

function startApprovalCountdown() {
    clearInterval(onlineState.requestTimer);
    let secondsRemaining = 60;
    const updateStatus = async () => {
        if (secondsRemaining <= 0) {
            clearInterval(onlineState.requestTimer);
            onlineState.requestTimer = null;
            const firebase = window.rungFirebase;
            try {
                await firebase.deleteMemberRequest(onlineState.roomId, firebase.user.uid);
            } catch (error) {
                console.error('Expiring the table request failed:', error);
                $('#room-lobby-status').addClass('is-error')
                    .text('The request could not be expired. Cancel it before sending another request.');
                return;
            }
            onlineState.joinRequestUnsubscribe?.();
            onlineState.joinRequestUnsubscribe = null;
            $('#room-lobby-status').addClass('is-error')
                .text('No host response within 60 seconds. The host may be away; you can retry or choose Watch on a public table.');
            $('#retry-room-request-btn').prop('hidden', false);
            $('#cancel-room-request-btn').prop('hidden', false);
            return;
        }
        $('#room-lobby-title').text('Waiting for host approval…');
        $('#room-lobby-description').text('Your request is in the host’s queue. You can cancel while you wait.');
        $('#room-lobby-status').removeClass('is-error')
            .text(`Waiting for the host · ${secondsRemaining}s remaining`);
        secondsRemaining -= 1;
    };
    updateStatus();
    onlineState.requestTimer = setInterval(updateStatus, 1000);
}

async function retryRoomRequest() {
    if (!onlineState.pendingRoom) return;
    try {
        await joinCloudRoom(
            onlineState.pendingRoom,
            onlineState.pendingRoomCode,
            currentPlayerName(),
            onlineState.pendingRequestAsViewer,
            onlineState.pendingPreferredSeatIndex
        );
    } catch (error) {
        console.error('Retrying the table request failed:', error);
        $('#room-lobby-status').addClass('is-error').text(error.message || 'Could not retry the request.');
    }
}

async function cancelRoomRequest() {
    const firebase = await firebaseApi();
    if (onlineState.roomId && onlineState.mode === 'joining') {
        try {
            await firebase.deleteMemberRequest(onlineState.roomId, firebase.user.uid);
        } catch (error) {
            console.error('Cancelling the table request failed:', error);
            $('#room-lobby-status').addClass('is-error').text('Could not cancel the request. Please try again.');
            return;
        }
    }
    clearRoomSubscriptions();
    onlineState.mode = null;
    onlineState.roomId = null;
    onlineState.room = null;
    onlineState.seatIndex = null;
    onlineState.isViewer = false;
    onlineState.isReplica = false;
    onlineState.pendingRoom = null;
    $('#room-lobby').prop('hidden', true);
    returnToLobby();
}

function resumeCloudRoom(room, seatIndex, asViewer) {
    const firebase = window.rungFirebase;
    const isHost = room.hostUid === firebase.user.uid;
    if (isHost && onlineState.isHost && onlineState.roomId === room.id) {
        onlineState.room = room;
        showGameScreen();
        return;
    }
    clearRoomSubscriptions();
    onlineState.mode = isHost ? 'host-rejoining' : 'client';
    onlineState.roomId = room.id;
    onlineState.room = room;
    onlineState.seatIndex = seatIndex >= 0 ? seatIndex : null;
    onlineState.isHost = false;
    onlineState.isViewer = (isHost || seatIndex < 0) ? true : false;
    onlineState.isReplica = true;
    onlineState.hasStarted = room.status === 'PLAYING';
    onlineState.pendingRoom = room;
    onlineState.pendingRoomCode = room.inviteCode || null;
    subscribeToRoom(room.id);
    if (!onlineState.isViewer) {
        onlineState.handUnsubscribe?.();
        onlineState.handUnsubscribe = firebase.listenPrivateHand(
            room.id, firebase.user.uid, acceptPrivateHand, error => {
                console.error('Private hand subscription failed while resuming:', error);
                showFirebaseError('The table reconnected, but your private hand could not be loaded.');
            });
        firebase.getPrivateHand?.(room.id, firebase.user.uid).then(hand => {
            if (hand) acceptPrivateHand(hand);
        }).catch(() => {});
    }
    $('#room-lobby').prop('hidden', true);
    if (room.status === 'PLAYING' && room.publicState) {
        showGameScreen();
        acceptPublicGameState(room.publicState, room.seats);
        if (isHost) setStatusMessage('Host session is no longer active; watching the last synchronized game state.');
    } else {
        showRoomLobby(room);
    }
}

async function resumeHostRoom(room) {
    const firebase = window.rungFirebase;
    const hostState = await firebase.getHostState(room.id);
    if (!hostState) {
        if (room.status === 'WAITING') {
            configureHostRoom(room);
            showRoomLobby(room);
            setStatusMessage('Host rejoined the table.');
            return;
        }
        resumeCloudRoom(room, room.seats.findIndex(seat => seat.uid === firebase.user.uid), true);
        setStatusMessage('Host recovery data is unavailable. Rejoined as a viewer of the synchronized game.');
        return;
    }

    const saved = hostState.game;
    if (!saved || !Array.isArray(saved.players) || saved.players.length !== 4 ||
        !Array.isArray(saved.deck) || saved.deck.length !== 52) {
        throw new Error('The saved host game is incomplete and cannot be resumed safely.');
    }
    const arrayKeys = [
        'deck', 'trickCards', 'tableCards', 'handWinners', 'playHistory'
    ];
    const objectKeys = [
        'lastPlayedByPlayer', 'playCountByPlayer', 'lastPlayInfoByPlayer'
    ];
    const scalarKeys = [
        'currentPlayer', 'trumpSuit', 'trumpChooserId', 'nextTrumpChooserId',
        'ledSuit', 'trickWinner', 'handsPlayed', 'gameState', 'team1Points',
        'team2Points', 'team1Consecutive', 'team2Consecutive', 'handIndex',
        'stackedPoints', 'currentStake', 'consecutiveWins', 'totalHandsPlayed',
        'lastWinningTeam', 'lastHandWinnerId', 'currentChallengeTeam',
        'stake1Completed', 'playSeqCounter', 'lastPlayedPlayerId',
        'initialLeadTeam', 'leadHolderPlayerId', 'scoringMode'
    ];
    arrayKeys.forEach(key => {
        if (Array.isArray(saved[key])) gameState[key] = saved[key];
    });
    objectKeys.forEach(key => {
        if (saved[key] && typeof saved[key] === 'object') gameState[key] = saved[key];
    });
    scalarKeys.forEach(key => {
        if (Object.prototype.hasOwnProperty.call(saved, key)) gameState[key] = saved[key];
    });
    saved.players.forEach((player, index) => {
        gameState.players[index] = {
            ...gameState.players[index],
            ...player,
            cards: Array.isArray(player.cards) ? player.cards : []
        };
    });

    clearRoomSubscriptions();
    configureHostRoom(room);
    onlineState.isHost = true;
    onlineState.hasStarted = room.status === 'PLAYING';
    onlineState.dealCompleted = hostState.dealCompleted === true;
    onlineState.gameId = hostState.gameId || null;
    onlineState.room = room;
    updateUI();
    renderReplicaTrick();
    showGameScreen();

    if (!onlineState.dealCompleted && gameState.gameState === 'TRUMP_SELECTION' &&
        gameState.players.every(player => player.cards.length === 5)) {
        continueRecoveredDeal().catch(error => {
            console.error('Continuing the recovered deal failed:', error);
            showFirebaseError('The saved game was restored, but dealing could not continue.');
        });
    } else {
        onlineState.dealCompleted = true;
        publishOnlineState(true);
        setStatusMessage('Host rejoined. The game has been restored.');
    }
}

async function continueRecoveredDeal() {
    const chooser = gameState.players.find(player => player.id === gameState.trumpChooserId);
    if (!chooser) throw new Error(`Trump chooser ${gameState.trumpChooserId} is invalid.`);
    const suit = chooser.isHuman
        ? await waitForTrumpSelection(chooser)
        : chooseTrumpSuit(chooser);
    selectTrump(suit, chooser);

    for (let index = 20; index < gameState.deck.length; index++) {
        gameState.players[index % 4].cards.push(gameState.deck[index]);
        if ((index + 1) % 4 === 0 || index === gameState.deck.length - 1) {
            updateUI();
            await sleep(45);
        }
    }
    gameState.players.forEach(player => player.cards.sort((a, b) =>
        a.suit !== b.suit
            ? SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit)
            : RANK_VALUES[a.rank] - RANK_VALUES[b.rank]));
    onlineState.dealCompleted = true;
    gameState.currentPlayer = gameState.players.findIndex(
        player => player.id === gameState.trumpChooserId
    );
    startTurn();
    await publishOnlineState(true);
    setStatusMessage('Host rejoined and the saved deal has continued.');
}

function configureHostRoom(room) {
    clearRoomSubscriptions();
    onlineState.mode = 'host';
    onlineState.roomId = room.id;
    onlineState.room = room;
    onlineState.seatIndex = 0;
    onlineState.isHost = true;
    onlineState.isViewer = false;
    onlineState.isReplica = false;
    onlineState.hasStarted = false;
    onlineState.dealCompleted = false;
    onlineState.missedTurns = {};
    onlineState.publishedGameKey = null;
    onlineState.roomUnsubscribe = null;
    onlineState.pendingRequests = new Map();
    onlineState.notifiedRequestKeys = new Set();
    onlineState.kickedBotSeats = new Set();
    if (room.scoringMode) {
        setScoringMode(room.scoringMode);
    }
    const user = window.rungFirebase.user;
    room.seats.forEach((seat, index) => {
        const player = gameState.players[index];
        if (seat.isBot && /^Player \d+ \(Bot\)$/.test(seat.name)) {
            seat.name = nextBotName(player.id);
        }
        player.name = seat.name;
        player.team = seat.team;
        player.uid = seat.uid || null;
        player.isHuman = !seat.isBot;
        player.isBot = seat.isBot;
    });
    subscribeToRoom(room.id);
    const firebase = window.rungFirebase;
    onlineState.requestsUnsubscribe = firebase.listenRequests(room.id, (requestSnapshot, changeType) => {
        const request = requestSnapshot.data();
        const requestKey = `${requestSnapshot.id}:${request.createdAt?.seconds || 0}:` +
            `${request.createdAt?.nanoseconds || 0}`;
        if (changeType === 'removed' || request.status !== 'pending') {
            onlineState.pendingRequests.delete(request.uid);
            renderPendingRequests();
            if (!onlineState.pendingRequests.size) {
                $('#table-admin-btn').removeClass('has-join-requests').removeAttr('aria-label');
            }
            if (onlineState.pendingRequests.size) {
                showNextPendingRequestNotice();
            } else if (onlineState.notifiedRequestKeys.has(requestKey) &&
                request.role === 'viewer' && request.status === 'accepted') {
                $('#host-join-notice-text').text(`${request.name || 'A viewer'} joined to watch the table.`);
                $('#host-join-notice-open').text('Open table');
                $('#host-join-notice').prop('hidden', false);
            } else if (changeType === 'removed' ||
                (onlineState.notifiedRequestKeys.has(requestKey) &&
                    (request.status === 'accepted' || request.status === 'rejected'))) {
                $('#host-join-notice').prop('hidden', true);
            }
            if (changeType === 'removed') onlineState.notifiedRequestKeys.delete(requestKey);
            return;
        }
        if (request.uid === user.uid) return;
        if (!onlineState.notifiedRequestKeys.has(requestKey)) {
            onlineState.notifiedRequestKeys.add(requestKey);
            notifyHostOfJoinRequest(request);
        }
        if (request.role === 'viewer') {
            onlineState.actionQueue = onlineState.actionQueue.then(() =>
                firebase.acceptRequest(room.id, request.uid))
                .catch(error => {
                    console.error('Accepting a viewer request failed:', error);
                    $('#room-lobby-status').text('A viewer request could not be accepted.');
                });
            return;
        }
        onlineState.pendingRequests.set(request.uid, request);
        // Auto-approve into a kicked bot seat if the host reserved by Player ID or kicked a bot for a friend!
        const reqPid = String(request.playerId || '').trim().toUpperCase();
        const reservedSeat = reqPid && onlineState.reservedPlayerIds?.has(reqPid)
            ? onlineState.reservedPlayerIds.get(reqPid)
            : null;
        const requestedPref = Number.isInteger(request.preferredSeatIndex) ? request.preferredSeatIndex : null;
        let autoSeat = null;
        if (Number.isInteger(reservedSeat) && onlineState.room?.seats?.[reservedSeat]?.isBot) {
            autoSeat = reservedSeat;
            onlineState.reservedPlayerIds.delete(reqPid);
        } else if (requestedPref !== null && onlineState.kickedBotSeats.has(requestedPref) &&
            onlineState.room?.seats?.[requestedPref]?.isBot) {
            autoSeat = requestedPref;
        } else if (onlineState.kickedBotSeats.size > 0) {
            const firstKicked = [...onlineState.kickedBotSeats].find(idx => onlineState.room?.seats?.[idx]?.isBot);
            if (Number.isInteger(firstKicked)) autoSeat = firstKicked;
        }
        if (Number.isInteger(autoSeat)) {
            onlineState.kickedBotSeats.delete(autoSeat);
            acceptGuestIntoSeat(request.uid, autoSeat).catch(err =>
                console.error('Auto-approving into kicked bot seat failed:', err));
            return;
        }
        renderPendingRequests();
    }, error => {
        console.error('Table member listener failed:', error);
        showFirebaseError('Unable to listen for table join requests.');
    });
    onlineState.actionsUnsubscribe = firebase.listenActions(room.id, actionSnapshot => {
        onlineState.actionQueue = onlineState.actionQueue.then(() => processOnlineAction(actionSnapshot))
            .catch(error => console.error('Processing a table move failed:', error));
    }, error => {
        console.error('Table move listener failed:', error);
        showFirebaseError('Unable to receive player moves.');
    });
}

function subscribeToRoom(roomId) {
    onlineState.roomUnsubscribe?.();
    onlineState.roomUnsubscribe = window.rungFirebase.listenRoom(roomId, room => {
        const myUid = window.rungFirebase?.user?.uid;
        const mySeatIndex = myUid ? (room.seats || []).findIndex(s => s && s.uid === myUid && !s.isBot) : -1;
        if (!onlineState.isHost && mySeatIndex >= 0) {
            const switchedToSeated = onlineState.isViewer || onlineState.seatIndex !== mySeatIndex || !onlineState.handUnsubscribe;
            onlineState.seatIndex = mySeatIndex;
            onlineState.isViewer = false;
            onlineState.isReplica = true;
            onlineState.mode = 'client';
            if (onlineState.joinRequestUnsubscribe) {
                onlineState.joinRequestUnsubscribe();
                onlineState.joinRequestUnsubscribe = null;
            }
            if (onlineState.requestTimer) {
                clearInterval(onlineState.requestTimer);
                onlineState.requestTimer = null;
            }
            $('#room-lobby').prop('hidden', true);
            if (switchedToSeated) {
                onlineState.handUnsubscribe?.();
                onlineState.handUnsubscribe = window.rungFirebase.listenPrivateHand(
                    roomId, myUid, acceptPrivateHand, error => {
                        console.error('Private hand subscription failed:', error);
                    }
                );
                window.rungFirebase.getPrivateHand?.(roomId, myUid).then(hand => {
                    if (hand) acceptPrivateHand(hand);
                }).catch(() => {});
            }
        } else if (onlineState.isReplica && !onlineState.isViewer &&
            Number.isInteger(onlineState.seatIndex) &&
            room.seats?.[onlineState.seatIndex]?.uid !== myUid) {
            const removedName = gameState.players[onlineState.seatIndex]?.name || 'Player';
            leaveRoomLobby();
            returnToLobby();
            $('#firebase-status').text(`${removedName}, your seat was returned to a bot after repeated timeouts.`)
                .addClass('is-error');
            return;
        }
        onlineState.room = room;
        if (onlineState.isHost) {
            room.seats.forEach((seat, index) => {
                const player = gameState.players[index];
                player.uid = seat.uid || null;
                player.name = seat.name;
                player.team = seat.team;
                player.isBot = seat.isBot;
                player.isHuman = !seat.isBot;
            });
            onlineState.room = room;
        }
        if (onlineState.voiceStream) syncVoicePeers(room);
        renderRoomLobby(room);
        if ((room.status === 'PLAYING' || room.status === 'COMPLETED') &&
            onlineState.isReplica && room.publicState) {
            showGameScreen();
            acceptPublicGameState(room.publicState, room.seats);
        } else if (room.status === 'WAITING' && !onlineState.isHost) {
            $('#room-lobby').prop('hidden', false);
        }
    }, error => {
        console.error('Table subscription failed:', error);
        showFirebaseError('Lost the connection to this table.');
    });
}

function renderRoomLobby(room) {
    const isHost = onlineState.isHost;
    const tableCode = room.tableCode || room.inviteCode || '';
    const ruleMode = room.publicState?.scoringMode || room.scoringMode || gameState.scoringMode;
    $('#room-lobby-title').text(room.status === 'PLAYING' ? 'Manage Live Table · Kick Bot / Invite Partner' : 'Waiting for players');
    $('#room-lobby-description').text(
        `${room.visibility === 'private' ? 'Private' : 'Public'} table · Rule: ${scoringModeLabel(ruleMode)} · ${Number(room.spectatorCount || 0)} viewer(s)`
    );
    $('#room-invite-code').text(tableCode ? `Table ID: ${tableCode}` : '').prop('hidden', !tableCode);
    $('#copy-invite-code-btn').prop('hidden', !tableCode)
        .text(room.visibility === 'private' ? 'Copy table / invite ID' : 'Copy table ID');
    $('#host-friend-invite-box').prop('hidden', !isHost);
    $('#start-table-btn').prop('hidden', !isHost || room.status !== 'WAITING');
    $('#join-as-viewer-btn').prop('hidden', isHost || room.visibility !== 'public' || onlineState.isViewer);
    const list = $('#room-seat-list').empty();
    const roleLabels = ['Host (Team 1)', 'Opponent (Team 2)', 'Host Partner (Team 1)', 'Opponent (Team 2)'];
    (room.seats || []).forEach((seat, index) => {
        const row = $('<div class="room-seat"></div>');
        const isKickedReady = onlineState.kickedBotSeats?.has(index);
        const seatInfo = $('<div class="room-seat-info"></div>');
        seatInfo.append($('<strong></strong>').text(`Seat ${index + 1}: ${seat.name}`));
        seatInfo.append($('<small class="room-seat-role"></small>').text(
            `${roleLabels[index]} · ${seat.isBot ? (isKickedReady ? 'BOT KICKED (Ready for friend!)' : 'BOT') : (seat.uid === window.rungFirebase?.user.uid ? 'YOU' : 'HUMAN PLAYER')}`
        ));
        row.append(seatInfo);
        if (isHost && index > 0) {
            const actions = $('<div class="room-seat-actions"></div>');
            if (seat.isBot) {
                actions.append(
                    $('<button type="button" class="lobby-primary room-kick-bot-btn"></button>')
                        .attr('data-kick-bot-seat', index)
                        .text(isKickedReady
                            ? (index === 2 ? 'Partner Seat Open (Copy ID)' : 'Seat Open (Copy ID)')
                            : (index === 2 ? 'Kick Bot · Invite Partner' : 'Kick Bot · Open Seat'))
                );
            } else {
                actions.append(
                    $('<button type="button" class="lobby-secondary room-kick-human-btn"></button>')
                        .attr('data-kick-human-seat', index)
                        .text('Replace with Bot')
                );
            }
            row.append(actions);
        }
        list.append(row);
    });
    $('#room-requests-section').prop('hidden', !isHost || onlineState.pendingRequests.size === 0);
    renderPendingRequests();
}

function renderPendingRequests() {
    const isHost = onlineState.isHost;
    const pending = [...onlineState.pendingRequests.entries()];
    $('#table-admin-btn').text(pending.length ? `Manage table · ${pending.length} request(s)` : 'Manage table');
    const section = $('#room-requests-section').prop('hidden', !isHost || pending.length === 0);
    if (!section.length) return;
    const list = $('#room-requests-list').empty();
    pending.sort(([, first], [, second]) => {
        const preferredSeat = request => request.role === 'player' &&
            onlineState.room?.seats?.[2]?.isBot ? 0 : 1;
        return preferredSeat(first) - preferredSeat(second);
    }).forEach(([uid, request]) => {
        const row = $('<div class="room-request-item"></div>');
        const prefNote = request.preferredSeatIndex === 2 ? ' (wants Partner Seat 3)' : '';
        row.append($('<strong></strong>').text(
            `${request.role === 'viewer' ? 'Viewer' : 'Player'} request · ${request.name || 'Guest'}${prefNote}`
        ));
        if (request.playerId) {
            row.append($('<span class="room-request-note"></span>').text(request.playerId));
        }
        const seatSelect = $('<select class="room-request-seat" aria-label="Bot seat to replace"></select>');
        const seats = (onlineState.room?.seats || []).map((seat, index) => ({ seat, index }));
        seats.sort((first, second) => {
            const preferred = item => {
                if (Number.isInteger(request.preferredSeatIndex) && item.index === request.preferredSeatIndex) return -1;
                return item.index === 2 ? 0 : item.index;
            };
            return preferred(first) - preferred(second);
        }).forEach(({ seat, index }) => {
            if (seat.isBot) {
                const role = index === 2 ? ' · Host Partner (Team 1)' : ` · Opponent (Team ${seat.team})`;
                seatSelect.append($('<option></option>').val(index)
                    .text(`Kick ${seat.name} -> Seat ${index + 1}${role}`));
            }
        });
        if (seatSelect.children().length) {
            row.append(seatSelect);
            row.append($('<button type="button" class="lobby-primary">Kick Bot & Approve</button>')
                .attr('data-approve-request', uid));
        } else {
            row.append($('<span class="room-request-note"></span>').text('No bot seats available'));
        }
        row.append($('<button type="button" class="lobby-secondary">Decline</button>')
            .attr('data-reject-request', uid));
        list.append(row);
    });
}

function notifyHostOfJoinRequest(request) {
    const isViewer = request.role === 'viewer';
    const message = isViewer
        ? `${request.name || 'A viewer'} wants to watch the table.`
        : `${request.name || 'A player'} wants to take a bot seat${request.preferredSeatIndex === 2 ? ' as your Partner (Seat 3)' : ''}!`;
    $('#host-join-notice-text').text(message);
    $('#host-join-notice-open').text(isViewer ? 'Open table' : 'Kick Bot & Approve');
    $('#host-join-notice').prop('hidden', false);
    if (!isViewer) {
        $('#table-admin-btn').addClass('has-join-requests')
            .attr('aria-label', `${message} Open table requests.`);
    }

    $('#enable-host-notifications').prop('hidden',
        !('Notification' in window) || Notification.permission !== 'default');
    showDesktopHostNotification(message, request.uid);
}

function showNextPendingRequestNotice() {
    const pending = [...onlineState.pendingRequests.values()];
    const request = pending[0];
    if (!request) return;
    const message = pending.length > 1
        ? `${request.name || 'A player'} and ${pending.length - 1} more player request(s) need approval.`
        : `${request.name || 'A player'} is waiting to replace a bot.`;
    $('#host-join-notice-text').text(message);
    $('#host-join-notice-open').text('Review request');
    $('#host-join-notice').prop('hidden', false);
    $('#table-admin-btn').addClass('has-join-requests')
        .attr('aria-label', `${message} Open table requests.`);
}

function showDesktopHostNotification(message, requestUid) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
        const notification = new Notification('RUNG table request', {
            body: message,
            tag: `rung-join-${onlineState.roomId}-${requestUid}`
        });
        notification.onclick = () => {
            window.focus();
            $('#host-join-notice').prop('hidden', true);
            if (onlineState.isHost && onlineState.room) showRoomLobby(onlineState.room);
        };
    } catch (error) {
        console.error('The desktop table-request notification could not be shown:', error);
    }
}

async function enableHostNotifications() {
    if (!('Notification' in window)) return;
    try {
        const permission = await Notification.requestPermission();
        $('#enable-host-notifications').prop('hidden', permission !== 'default');
        if (permission === 'granted') {
            showDesktopHostNotification($('#host-join-notice-text').text(), Date.now());
        } else {
            setStatusMessage('Desktop notifications were not enabled; in-table alerts will still appear.');
        }
    } catch (error) {
        console.error('Enabling desktop table-request notifications failed:', error);
        setStatusMessage('Desktop notifications could not be enabled.');
    }
}

async function acceptGuestIntoSeat(uid, seatIndex) {
    const accepted = await window.rungFirebase.acceptRequest(onlineState.roomId, uid, seatIndex);
    if (!accepted || accepted.status !== 'accepted') {
        setStatusMessage('That bot seat is no longer available. Choose another seat.');
        return null;
    }
    onlineState.pendingRequests.delete(uid);
    onlineState.kickedBotSeats?.delete(accepted.seatIndex);
    if (!onlineState.pendingRequests.size) {
        $('#table-admin-btn').removeClass('has-join-requests').removeAttr('aria-label');
    }
    const player = gameState.players[accepted.seatIndex];
    const oldBotName = player.name;
    player.uid = accepted.uid;
    player.name = accepted.name;
    player.isHuman = true;
    player.isBot = false;
    onlineState.room.seats[accepted.seatIndex] = {
        ...onlineState.room.seats[accepted.seatIndex],
        uid: accepted.uid,
        name: accepted.name,
        isBot: false
    };
    onlineState.publishedGameKey = null;
    renderRoomLobby(onlineState.room);
    updateUI();
    $('#host-join-notice').prop('hidden', true);
    const roleLabel = accepted.seatIndex === 2 ? 'as your Partner (Seat 3)' : `in Seat ${accepted.seatIndex + 1}`;
    const joinMsg = `${accepted.name} replaced bot ${oldBotName} ${roleLabel} and took over their cards!`;
    setStatusMessage(joinMsg);
    showTableAnnouncement(joinMsg, 3500);
    if (onlineState.roomId) {
        await publishOnlineState(true);
        if (gameState.gameState === 'PLAYING' && gameState.currentPlayer === accepted.seatIndex) {
            startOnlineTurnTimer();
        }
    }
    return accepted;
}

async function approveRoomRequest() {
    const uid = $(this).attr('data-approve-request');
    const row = $(this).closest('.room-request-item');
    const seatIndex = Number(row.find('.room-request-seat').val());
    if (!uid || !Number.isInteger(seatIndex)) return;
    $(this).prop('disabled', true).text('Approving…');
    try {
        await acceptGuestIntoSeat(uid, seatIndex);
    } catch (error) {
        console.error('Approving the player request failed:', error);
        setStatusMessage(error.message || 'The guest could not be approved.');
        $(this).prop('disabled', false).text('Kick Bot & Approve');
    }
}

async function kickBotForFriend(seatIndex) {
    if (!Number.isInteger(seatIndex) || seatIndex < 1 || seatIndex > 3) return;
    if (!onlineState.roomId || !onlineState.isHost) {
        // If playing offline solo game, automatically upgrade to a live online host room so a friend can join mid-game!
        try {
            setStatusMessage('Opening live table so your friend can replace this bot and continue the game…');
            const firebase = await firebaseApi();
            const room = await firebase.createRoom(currentPlayerName(), 'public', gameState.scoringMode);
            const savedCards = gameState.players.map(p => [...p.cards]);
            const savedTricks = gameState.players.map(p => p.tricks);
            configureHostRoom(room);
            gameState.players.forEach((p, idx) => {
                p.cards = savedCards[idx];
                p.tricks = savedTricks[idx];
            });
            onlineState.hasStarted = true;
            onlineState.dealCompleted = gameState.gameState === 'PLAYING';
            onlineState.gameId = `${room.id}-${Date.now()}`;
            onlineState.kickedBotSeats.add(seatIndex);
            await publishOnlineState(true);
            showGameScreen();
            showRoomLobby(onlineState.room);
            const code = room.tableCode || room.inviteCode || '';
            if (code && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(code).catch(() => {});
            }
            const msg = `Bot in Seat ${seatIndex + 1}${seatIndex === 2 ? ' (Your Partner)' : ''} kicked out! Share Table ID ${code} — your friend will automatically take this seat and cards.`;
            $('#room-lobby-status').removeClass('is-error').text(msg);
            setStatusMessage(msg);
            return;
        } catch (error) {
            console.error('Upgrading solo game to live room for friend failed:', error);
            setStatusMessage('Could not create live room for friend: ' + (error.message || 'Check connection'));
            return;
        }
    }
    // Check if there is already a pending player request waiting!
    const pendingEntries = [...onlineState.pendingRequests.entries()].filter(([, req]) => req.role !== 'viewer');
    if (pendingEntries.length > 0) {
        const [firstUid] = pendingEntries[0];
        await acceptGuestIntoSeat(firstUid, seatIndex);
        return;
    }
    onlineState.kickedBotSeats.add(seatIndex);
    const code = onlineState.room?.tableCode || onlineState.room?.inviteCode || '';
    if (code && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code).catch(() => {});
    }
    renderRoomLobby(onlineState.room);
    updateUI();
    const roleDesc = seatIndex === 2 ? 'Partner Seat 3' : `Seat ${seatIndex + 1}`;
    const statusText = `Bot kicked from ${roleDesc}! Table ID ${code} copied — when your friend joins with ${code}, they will immediately take ${roleDesc} and continue the game.`;
    $('#room-lobby-status').removeClass('is-error').text(statusText);
    setStatusMessage(statusText);
    showTableAnnouncement(`Bot kicked from ${roleDesc} · Ready for friend (Table ID: ${code})`, 3600);
}

function kickHumanPlayerToBot(seatIndex) {
    if (!onlineState.isHost || !Number.isInteger(seatIndex) || seatIndex < 1 || seatIndex > 3) return;
    const player = gameState.players[seatIndex];
    if (!player || player.isBot) return;
    replacePlayerWithBot(player);
    renderRoomLobby(onlineState.room);
    updateUI();
    if (gameState.gameState === 'PLAYING' && gameState.currentPlayer === seatIndex) {
        startTurn();
    }
}

async function rejectRoomRequest() {
    const uid = $(this).attr('data-reject-request');
    if (!uid) return;
    try {
        await window.rungFirebase.rejectRequest(onlineState.roomId, uid);
        onlineState.pendingRequests.delete(uid);
        renderPendingRequests();
        if (!onlineState.pendingRequests.size) {
            $('#table-admin-btn').removeClass('has-join-requests').removeAttr('aria-label');
            $('#host-join-notice').prop('hidden', true);
        }
    } catch (error) {
        console.error('Declining the player request failed:', error);
        setStatusMessage(error.message || 'The guest request could not be declined.');
    }
}

function showRoomLobby(room) {
    closeTrumpSelection();
    $('#splash-screen, #lobby-screen, #create-table-modal').prop('hidden', true);
    $('#room-lobby').prop('hidden', false);
    renderRoomLobby(room);
}

async function joinCurrentRoomAsViewer() {
    const room = onlineState.room || onlineState.publicRoomsById?.[onlineState.roomId];
    if (!room || room.visibility !== 'public') return;
    try {
        await joinCloudRoom(room, null, currentPlayerName(), true);
    } catch (error) {
        console.error('Viewer join failed:', error);
    }
}

async function copyInviteCode() {
    const code = onlineState.room?.tableCode || onlineState.room?.inviteCode;
    if (!code) return;
    try {
        await navigator.clipboard.writeText(code);
        $('#copy-invite-code-btn').text('Copied!');
        setTimeout(() => $('#copy-invite-code-btn').text(
            onlineState.room?.visibility === 'private' ? 'Copy table / invite ID' : 'Copy table ID'
        ), 1800);
    } catch (error) {
        console.error('Copying invite code failed:', error);
        $('#room-lobby-status').text(`Share this invite code: ${code}`);
    }
}

function showGameScreen() {
    $('#splash-screen, #lobby-screen, #room-lobby, #create-table-modal').prop('hidden', true);
    $('#rung-app').removeClass('is-screen-visible');
    $('.game-container').addClass('is-active');
    if (gameState.gameState === 'TRUMP_SELECTION' && onlineState.activeTrumpPrompt) {
        openTrumpSelection();
    }
    const voiceSupported = Boolean(
        navigator.mediaDevices?.getUserMedia && typeof RTCPeerConnection === 'function'
    );
    $('#voice-toggle-btn').prop('disabled',
        !onlineState.roomId || onlineState.isViewer || !voiceSupported)
        .attr('title', voiceSupported
            ? 'Join the table voice chat'
            : 'Microphone and WebRTC are not supported by this browser or connection');
    $('#new-game-btn').prop('disabled', onlineState.isReplica);
    $('#play-again-btn').prop('disabled', onlineState.isReplica && onlineState.isViewer);
    $('#table-admin-btn').prop('hidden', !onlineState.isHost);
    const hasBots = gameState.players.slice(1).some(p => p.isBot);
    $('#top-kick-bot-btn').prop('hidden', !(onlineState.isHost || !onlineState.roomId) || !hasBots);
    const tableCode = onlineState.room?.tableCode || onlineState.room?.inviteCode || '';
    $('#live-table-badge')
        .prop('hidden', !tableCode)
        .text(tableCode ? `Table ID: ${tableCode} 📋` : '');
    const viewerCanTakeBot = onlineState.isViewer && Boolean(onlineState.room?.seats?.some(s => s.isBot));
    $('#viewer-take-seat-btn').prop('hidden', !viewerCanTakeBot);
    if (onlineState.isViewer) $('#current-player').text('Watching Live Game');
}

function prepareNewGame() {
    if (onlineState.isReplica) {
        setStatusMessage('Only the table host can start the next game.');
        return false;
    }
    if (onlineState.isHost) {
        onlineState.gameId = `${onlineState.roomId}-${Date.now()}`;
        onlineState.hasStarted = false;
        onlineState.publishedGameKey = null;
        onlineState.missedTurns = {};
    }
    return true;
}

function leaveRoomLobby() {
    if (onlineState.isHost) {
        $('#room-lobby').prop('hidden', true);
        return;
    }
    const roomId = onlineState.roomId;
    const wasJoining = onlineState.mode === 'joining' && !onlineState.isReplica;
    if (onlineState.voiceStream) toggleVoice();
    if (roomId && wasJoining) {
        firebaseApi().then(firebase => firebase.deleteMemberRequest(roomId, firebase.user.uid))
            .catch(error => console.error('Removing the pending table request failed:', error));
    }
    clearRoomSubscriptions();
    onlineState.mode = null;
    onlineState.roomId = null;
    onlineState.room = null;
    onlineState.seatIndex = null;
    onlineState.isReplica = false;
    onlineState.isViewer = false;
    onlineState.pendingAction = false;
    onlineState.activeTrumpPrompt = false;
    $('#room-lobby').prop('hidden', true);
}

function returnToLobby() {
    closeTrumpSelection();
    if (!onlineState.isHost && onlineState.roomId) leaveRoomLobby();
    $('#rung-app').addClass('is-screen-visible');
    $('.game-container').removeClass('is-active');
    $('#splash-screen').prop('hidden', true);
    $('#lobby-screen').prop('hidden', false);
    $('#room-lobby').prop('hidden', true);
    refreshHallOfFame();
    refreshPublicTables();
}

async function startOnlineGame() {
    if (!onlineState.isHost || !onlineState.roomId) return;
    try {
        const firebase = await firebaseApi();
        onlineState.gameId = `${onlineState.roomId}-${Date.now()}`;
        await firebase.publishRoom(onlineState.roomId, {
            status: 'PLAYING',
            seats: gameState.players.map(player => ({
                uid: player.uid || null,
                name: player.name,
                team: player.team,
                isBot: !player.uid
            }))
        }, [], null);
        onlineState.room.status = 'PLAYING';
        onlineState.hasStarted = false;
        $('#room-lobby').prop('hidden', true);
        showGameScreen();
        await initializeGame();
        onlineState.hasStarted = true;
        updateUI();
        startOnlineTurnTimer();
    } catch (error) {
        console.error('Starting the online game failed:', error);
        $('#room-lobby-status').addClass('is-error').text(error.message || 'Could not start the game.');
    }
}

function highestValidCard(player) {
    const validCards = player.cards.filter(card => isValidPlay(card, player));
    if (!validCards.length) return null;
    return validCards.reduce((best, card) => {
        const cardValue = (card.suit === gameState.trumpSuit ? 100 : 0) + RANK_VALUES[card.rank];
        const bestValue = (best.suit === gameState.trumpSuit ? 100 : 0) + RANK_VALUES[best.rank];
        return cardValue > bestValue ? card : best;
    });
}

function startOnlineTurnTimer() {
    if (!onlineState.isHost || !onlineState.hasStarted || gameState.gameState !== 'PLAYING') return;
    const player = gameState.players[gameState.currentPlayer];
    if (!player || !player.isHuman) return;
    const turnKey = `${gameState.totalHandsPlayed}:${gameState.playSeqCounter}:${player.id}`;
    if (onlineState.turnTimerKey === turnKey) return;
    clearTimeout(onlineState.turnTimer);
    onlineState.turnTimerKey = turnKey;
    onlineState.turnTimer = setTimeout(() => {
        if (gameState.gameState !== 'PLAYING' || gameState.players[gameState.currentPlayer]?.id !== player.id) return;
        const automaticCard = highestValidCard(player);
        if (!automaticCard) {
            console.error('Turn timeout found no valid card for player:', player.id);
            setStatusMessage('No valid card was available for the timed-out turn.');
            return;
        }
        const uid = player.uid;
        if (uid) {
            onlineState.missedTurns[uid] = (onlineState.missedTurns[uid] || 0) + 1;
            if (onlineState.missedTurns[uid] >= MAX_MISSED_TURNS) {
                replacePlayerWithBot(player);
            } else {
                setStatusMessage(`${player.name} timed out (${onlineState.missedTurns[uid]}/${MAX_MISSED_TURNS}); highest valid card played.`);
            }
        } else {
            setStatusMessage(`${player.name} timed out; highest valid card played.`);
        }
        playCard(automaticCard, player);
    }, ONLINE_TURN_TIMEOUT_MS);
}

function replacePlayerWithBot(player) {
    const replacedUid = player.uid;
    const replacedName = player.name;
    player.uid = null;
    player.name = nextBotName(player.id);
    player.isHuman = false;
    player.isBot = true;
    onlineState.missedTurns[replacedUid] = 0;
    if (onlineState.room) {
        onlineState.room.seats[player.id - 1] = {
            uid: null, name: player.name, team: player.team, isBot: true
        };
        onlineState.room.memberUids = onlineState.room.memberUids.filter(uid => uid !== replacedUid);
    }
    publishOnlineState();
    setStatusMessage(`${replacedName} missed three turns and was replaced by a bot.`);
}

async function processOnlineAction(actionSnapshot) {
    if (!onlineState.isHost) return;
    const firebase = await firebaseApi();
    const action = actionSnapshot.data();
    try {
        if (action.kind === 'trump') {
            const chooser = gameState.players.find(player => player.id === gameState.trumpChooserId);
            if (gameState.gameState !== 'TRUMP_SELECTION' || !chooser ||
                chooser.uid !== action.uid || chooser.id - 1 !== action.seatIndex ||
                !SUITS.includes(action.trumpSuit) ||
                typeof onlineState.pendingTrumpChoice !== 'function') {
                await firebase.markActionProcessed(actionSnapshot.ref);
                return;
            }
            const resolveChoice = onlineState.pendingTrumpChoice;
            onlineState.missedTurns[action.uid] = 0;
            onlineState.pendingTrumpChoice = null;
            await firebase.markActionProcessed(actionSnapshot.ref);
            resolveChoice(action.trumpSuit);
            return;
        }
        if (action.kind === 'reaction') {
            const isViewerReaction = action.seatIndex === -1 || action.seatIndex === null;
            const player = !isViewerReaction ? gameState.players[action.seatIndex] : null;
            const text = String(action.reaction || '').trim().slice(0, 80);
            if (!text || (!isViewerReaction && (!player || player.uid !== action.uid))) {
                await firebase.markActionProcessed(actionSnapshot.ref);
                return;
            }
            if (text === '__REMATCH__' && !isViewerReaction && gameState.gameState === 'GAME_END') {
                await firebase.markActionProcessed(actionSnapshot.ref);
                if (prepareNewGame()) {
                    rulesAreOpen = false;
                    $('#celebration').hide();
                    await initializeGame();
                    onlineState.hasStarted = true;
                    updateUI();
                    startOnlineTurnTimer();
                }
                return;
            }
            const entry = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                playerId: player ? player.id : 1,
                playerName: player ? player.name : (action.senderName || 'Viewer'),
                text
            };
            gameState.lastReaction = entry;
            renderIncomingReaction(entry);
            await firebase.markActionProcessed(actionSnapshot.ref);
            await publishOnlineState(true);
            return;
        }
        if (!onlineState.hasStarted || action.kind !== 'card') {
            await firebase.markActionProcessed(actionSnapshot.ref);
            return;
        }
        const player = gameState.players[action.seatIndex];
        const card = action.card;
        if (gameState.trickCards.length >= 4 || !player || player.uid !== action.uid || gameState.currentPlayer !== action.seatIndex ||
            !player.cards.some(item => item.rank === card.rank && item.suit === card.suit) ||
            !isValidPlay(card, player)) {
            await firebase.markActionProcessed(actionSnapshot.ref);
            return;
        }
        onlineState.missedTurns[action.uid] = 0;
        await firebase.markActionProcessed(actionSnapshot.ref);
        playCard(card, player);
    } catch (error) {
        console.error('Could not apply a remote player move:', error);
        await firebase.markActionProcessed(actionSnapshot.ref);
    }
}

function publicGameState() {
    return {
        gameState: gameState.gameState,
        scoringMode: gameState.scoringMode || 'classic_3_2',
        currentPlayer: gameState.currentPlayer,
        trumpSuit: gameState.trumpSuit,
        ledSuit: gameState.ledSuit,
        tableCards: gameState.tableCards.map(item => ({
            player: item.player || 1,
            card: { suit: item.card ? item.card.suit : item.suit, rank: item.card ? item.card.rank : item.rank },
            sequence: item.sequence || 1
        })),
        trickCards: gameState.trickCards.map(item => ({
            player: item.player,
            card: { suit: item.card.suit, rank: item.card.rank },
            sequence: item.sequence
        })),
        team1Points: gameState.team1Points,
        team2Points: gameState.team2Points,
        team1Consecutive: gameState.team1Consecutive,
        team2Consecutive: gameState.team2Consecutive,
        stackedPoints: gameState.stackedPoints,
        currentStake: gameState.currentStake,
        totalHandsPlayed: gameState.totalHandsPlayed,
        handsPlayed: gameState.handsPlayed,
        handWinners: gameState.handWinners,
        lastWinningTeam: gameState.lastWinningTeam,
        lastHandWinnerId: gameState.lastHandWinnerId,
        nextTrumpChooserId: gameState.nextTrumpChooserId,
        trumpChooserId: gameState.trumpChooserId,
        gameId: onlineState.gameId,
        currentChallengeTeam: gameState.currentChallengeTeam,
        consecutiveWins: gameState.consecutiveWins,
        leadHolderPlayerId: gameState.leadHolderPlayerId,
        lastPlayedPlayerId: gameState.lastPlayedPlayerId,
        botBanter: gameState.botBanter,
        botBanterLog: gameState.botBanterLog,
        lastReaction: gameState.lastReaction,
        playSeqCounter: gameState.playSeqCounter,
        players: gameState.players.map(player => ({
            id: player.id,
            uid: player.uid || null,
            name: player.name,
            team: player.team,
            isBot: !player.uid,
            cardCount: player.cards.length,
            tricks: player.tricks
        })),
        lastPlays: Object.fromEntries(
            Object.entries(gameState.lastPlayInfoByPlayer).map(([id, info]) => [
                id, info ? { ...info, card: { suit: info.card.suit, rank: info.card.rank } } : null
            ])
        )
    };
}

function applyPublicGameState(state, seats) {
    if (!onlineState.isReplica || !state || !Array.isArray(state.players) ||
        !Array.isArray(seats) || seats.length !== 4) return;
    const myUid = window.rungFirebase?.user?.uid;
    const mySeatedIdx = myUid ? seats.findIndex(s => s && s.uid === myUid && !s.isBot) : -1;
    if (!onlineState.isHost && mySeatedIdx >= 0) {
        onlineState.seatIndex = mySeatedIdx;
        onlineState.isViewer = false;
    }
    gameState.gameState = state.gameState;
    if (state.scoringMode && SCORING_MODES.includes(state.scoringMode)) {
        gameState.scoringMode = state.scoringMode;
    }
    gameState.currentPlayer = state.currentPlayer;
    gameState.trumpSuit = state.trumpSuit;
    gameState.ledSuit = state.ledSuit;
    gameState.tableCards = Array.isArray(state.tableCards) ? state.tableCards : [];
    gameState.trickCards = state.trickCards || [];
    gameState.trumpChooserId = state.trumpChooserId || gameState.trumpChooserId;
    onlineState.gameId = state.gameId || onlineState.gameId;
    gameState.team1Points = state.team1Points || 0;
    gameState.team2Points = state.team2Points || 0;
    gameState.team1Consecutive = state.team1Consecutive || 0;
    gameState.team2Consecutive = state.team2Consecutive || 0;
    gameState.stackedPoints = state.stackedPoints || 0;
    gameState.currentStake = state.currentStake || 1;
    gameState.totalHandsPlayed = state.totalHandsPlayed || 0;
    gameState.handsPlayed = state.handsPlayed || 0;
    gameState.handWinners = state.handWinners || [];
    gameState.lastWinningTeam = state.lastWinningTeam || null;
    gameState.lastHandWinnerId = state.lastHandWinnerId || null;
    gameState.nextTrumpChooserId = state.nextTrumpChooserId || gameState.nextTrumpChooserId;
    gameState.currentChallengeTeam = state.currentChallengeTeam || null;
    gameState.consecutiveWins = state.consecutiveWins || 0;
    gameState.leadHolderPlayerId = state.leadHolderPlayerId || null;
    gameState.lastPlayedPlayerId = state.lastPlayedPlayerId || null;
    gameState.playSeqCounter = state.playSeqCounter || 0;
    gameState.botBanterLog = Array.isArray(state.botBanterLog) ? state.botBanterLog : [];
    (state.players || []).forEach((shared, index) => {
        const player = gameState.players[index];
        if (!player) return;
        const seat = seats[index];
        if (!seat) return;
        player.uid = seat.uid || null;
        player.name = seat.name;
        player.team = seat.team;
        player.isBot = seat.isBot;
        player.isHuman = !onlineState.isViewer && index === onlineState.seatIndex;
        if (index !== onlineState.seatIndex) {
            player.cards = Array.from({ length: shared.cardCount }, () => ({ suit: 'hidden', rank: 'hidden' }));
        } else {
            player.cards = (player.cards || []).filter(c => c && c.suit && c.suit !== 'hidden');
            if (player.cards.length === 0 && shared.cardCount > 0 && onlineState.roomId && myUid) {
                window.rungFirebase?.getPrivateHand?.(onlineState.roomId, myUid).then(hand => {
                    if (hand) acceptPrivateHand(hand);
                }).catch(() => {});
            }
        }
        player.tricks = shared.tricks || 0;
    });
    gameState.lastPlayInfoByPlayer = state.lastPlays || { 1: null, 2: null, 3: null, 4: null };
    [1, 2, 3, 4].forEach(pid => {
        const info = gameState.lastPlayInfoByPlayer[pid];
        if (info && info.card) {
            gameState.lastPlayedByPlayer[pid] = [info.card];
        }
    });
    gameState.botBanter = state.botBanter || null;
    if (state.botBanter && state.botBanter.id !== onlineState.lastBotBanterId) {
        renderPunjabiBanter(state.botBanter);
    }
    gameState.lastReaction = state.lastReaction || null;
    if (state.lastReaction && state.lastReaction.id !== onlineState.lastReactionId) {
        renderIncomingReaction(state.lastReaction);
    }
    updateUI();
    renderReplicaTrick();
    if (!onlineState.isViewer && state.currentPlayer === onlineState.seatIndex) {
        onlineState.pendingAction = false;
    }
    if (state.gameState === 'TRUMP_SELECTION') {
        const chooser = gameState.players.find(player => player.id === state.trumpChooserId);
        setStatusMessage(`${chooser?.name || 'Player'} is choosing trump…`);
        showRemoteTrumpPrompt();
    } else {
        onlineState.activeTrumpPrompt = false;
        if (state.currentPlayer !== onlineState.seatIndex) {
            onlineState.pendingAction = false;
        }
        closeTrumpSelection();
        $('#trump-selection .trump-btn').prop('disabled', false);
        setStatusMessage(onlineState.isViewer
            ? `${gameState.players[state.currentPlayer]?.name || 'Player'} is playing…`
            : (state.currentPlayer === onlineState.seatIndex
                ? 'Your turn - play a card'
                : `${gameState.players[state.currentPlayer]?.name || 'Player'} is playing…`));
    }
}

function acceptPublicGameState(state, seats) {
    applyPublicGameState(state, seats);
    if (state.gameState === 'GAME_END' && !$('#celebration').is(':visible')) {
        endGame();
    } else if (state.gameState && state.gameState !== 'GAME_END' && !rulesAreOpen) {
        $('#celebration').hide();
    }
}

function renderReplicaTrick() {
    $('.trick-area .played-card').remove();
    const stackedCards = (gameState.tableCards || []).map((item, idx) => ({
        player: item.player || ((idx % 4) + 1),
        card: item.card || { suit: item.suit, rank: item.rank },
        sequence: item.sequence || ((idx % 4) + 1),
        isStacked: true
    }));
    const activeCards = (gameState.trickCards || []).map((item, idx) => ({
        player: item.player,
        card: item.card,
        sequence: item.sequence || (idx + 1),
        isStacked: false
    }));
    const allTableCards = [...stackedCards, ...activeCards];
    allTableCards.forEach((trick, index) => {
        const card = createCardElement(trick.card, false)
            .addClass('played-card')
            .toggleClass('stacked-table-card', Boolean(trick.isStacked))
            .attr('data-player-id', trick.player)
            .attr('data-play-number', trick.sequence || index + 1);
        if (!trick.isStacked && index === allTableCards.length - 1) {
            card.addClass('last-played-card');
        }
        const seat = getDisplaySeatIndex(Number(trick.player) - 1) + 1;
        const rotDeg = { 1: 0, 2: 90, 3: 180, 4: 270 }[seat] || 0;
        card.append(
            $('<span class="play-sequence"></span>')
                .text(trick.sequence || index + 1)
                .css('transform', `rotate(${-rotDeg}deg)`)
        );
        const placement = `translate(-50%, -50%) rotate(${rotDeg}deg)`;
        const inward = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-height')) * 0.46;
        const offsets = { 1: [0, inward], 2: [-inward, 0], 3: [0, -inward], 4: [inward, 0] };
        card.css({
            position: 'absolute',
            left: `calc(50% + ${offsets[seat][0]}px)`,
            top: `calc(50% + ${offsets[seat][1]}px)`,
            transform: placement,
            zIndex: 1000 + index
        });
        $('.trick-area').append(card);
    });
}

function acceptPrivateHand(hand) {
    if (!onlineState.isReplica || !Number.isInteger(onlineState.seatIndex)) return;
    onlineState.isViewer = false;
    onlineState.pendingAction = false;
    const localPlayer = gameState.players[onlineState.seatIndex];
    if (localPlayer) {
        localPlayer.cards = Array.isArray(hand?.cards) ? hand.cards : [];
        localPlayer.isHuman = true;
        localPlayer.isBot = false;
    }
    updateUI();
    renderReplicaTrick();
}

function showRemoteTrumpPrompt() {
    if (!onlineState.isReplica || onlineState.isViewer ||
        onlineState.seatIndex !== gameState.trumpChooserId - 1) {
        onlineState.activeTrumpPrompt = false;
        closeTrumpSelection();
        return;
    }
    $('#trump-selection-title').text('Choose the trump suit for your team');
    const promptAlreadyActive = onlineState.activeTrumpPrompt;
    onlineState.activeTrumpPrompt = true;
    openTrumpSelection();
    if (promptAlreadyActive) return;
    $('#trump-selection .trump-btn').off('click.remoteTrump').on('click.remoteTrump', async function() {
        const suit = $(this).attr('data-suit');
        if (!SUITS.includes(suit) || onlineState.pendingAction) return;
        onlineState.pendingAction = true;
        $('#trump-selection .trump-btn').prop('disabled', true);
        setStatusMessage('Sending your trump choice…');
        try {
            const firebase = await firebaseApi();
            await firebase.submitAction(onlineState.roomId, onlineState.seatIndex, suit, 'trump');
        } catch (error) {
            console.error('Submitting the trump choice failed:', error);
            setStatusMessage('Your trump choice could not be sent. Please try again.');
            onlineState.pendingAction = false;
            $('#trump-selection .trump-btn').prop('disabled', false);
        }
    });
}

function publishOnlineState(force = false) {
    if (!onlineState.isHost || (!onlineState.hasStarted && !force) ||
        !onlineState.roomId || !window.rungFirebase) return Promise.resolve();
    const state = publicGameState();
    const seats = state.players.map(player => ({
        uid: player.uid,
        name: player.name,
        team: player.team,
        isBot: player.isBot
    }));
    const key = JSON.stringify({ state, seats });
    if (!force && key === onlineState.publishedGameKey) return Promise.resolve();
    onlineState.publishedGameKey = key;
    onlineState.room.seats = seats;
    const work = async () => {
        const hostSnapshot = {
            game: JSON.parse(JSON.stringify({
                deck: gameState.deck,
                players: gameState.players,
                currentPlayer: gameState.currentPlayer,
                trumpSuit: gameState.trumpSuit,
                trumpChooserId: gameState.trumpChooserId,
                nextTrumpChooserId: gameState.nextTrumpChooserId,
                ledSuit: gameState.ledSuit,
                trickCards: gameState.trickCards,
                trickWinner: gameState.trickWinner,
                handsPlayed: gameState.handsPlayed,
                gameState: gameState.gameState,
                team1Points: gameState.team1Points,
                team2Points: gameState.team2Points,
                team1Consecutive: gameState.team1Consecutive,
                team2Consecutive: gameState.team2Consecutive,
                tableCards: gameState.tableCards,
                handIndex: gameState.handIndex,
                handWinners: gameState.handWinners,
                stackedPoints: gameState.stackedPoints,
                currentStake: gameState.currentStake,
                consecutiveWins: gameState.consecutiveWins,
                totalHandsPlayed: gameState.totalHandsPlayed,
                lastWinningTeam: gameState.lastWinningTeam,
                lastHandWinnerId: gameState.lastHandWinnerId,
                currentChallengeTeam: gameState.currentChallengeTeam,
                stake1Completed: gameState.stake1Completed,
                playHistory: gameState.playHistory,
                lastPlayedByPlayer: gameState.lastPlayedByPlayer,
                playSeqCounter: gameState.playSeqCounter,
                playCountByPlayer: gameState.playCountByPlayer,
                lastPlayedPlayerId: gameState.lastPlayedPlayerId,
                lastPlayInfoByPlayer: gameState.lastPlayInfoByPlayer,
                botBanter: gameState.botBanter,
                botBanterLog: gameState.botBanterLog,
                initialLeadTeam: gameState.initialLeadTeam,
                leadHolderPlayerId: gameState.leadHolderPlayerId,
                scoringMode: gameState.scoringMode || 'classic_3_2'
            })),
            gameId: onlineState.gameId,
            dealCompleted: onlineState.dealCompleted
        };
        await Promise.all([
            window.rungFirebase.publishRoom(onlineState.roomId, {
                status: gameState.gameState === 'GAME_END' ? 'COMPLETED' : 'PLAYING',
                scoringMode: gameState.scoringMode || 'classic_3_2',
                seats,
                memberUids: [...new Set([
                    ...seats.filter(seat => seat.uid).map(seat => seat.uid),
                    ...(onlineState.room.viewerUids || [])
                ])],
                spectatorCount: onlineState.room.spectatorCount || 0
            }, gameState.players, state),
            window.rungFirebase.saveHostState(onlineState.roomId, hostSnapshot)
        ]);
    };
    onlineState.actionQueue = onlineState.actionQueue.then(work).catch(error => {
        console.error('Publishing the game state failed:', error);
        setStatusMessage('Connection interrupted - game changes could not be synced.');
    });
    return onlineState.actionQueue;
}

function scheduleVoiceSignal(peerUid, initiate) {
    if (!onlineState.voiceStream || !onlineState.roomId || peerUid === window.rungFirebase.user.uid ||
        onlineState.voicePeers.has(peerUid)) return;
    const connection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    const state = {
        connection,
        sessionId: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        signalId: null,
        appliedOffer: false,
        appliedAnswer: false,
        unsubscribe: null
    };
    onlineState.voicePeers.set(peerUid, state);
    onlineState.voiceStream.getTracks().forEach(track => connection.addTrack(track, onlineState.voiceStream));
    connection.ontrack = event => {
        let audio = document.getElementById(`voice-audio-${peerUid}`);
        if (!audio) {
            audio = document.createElement('audio');
            audio.id = `voice-audio-${peerUid}`;
            audio.className = 'voice-audio';
            audio.autoplay = true;
            audio.playsInline = true;
            document.body.append(audio);
        }
        audio.srcObject = event.streams[0] || new MediaStream([event.track]);
        event.track.addEventListener('ended', () => {
            resetVoicePeer(peerUid, state);
            if (onlineState.voiceStream &&
                onlineState.room?.seats?.some(seat => seat.uid === peerUid)) {
                scheduleVoiceSignal(peerUid, true);
            }
        }, { once: true });
        audio.play().catch(error => {
            console.warn('Remote voice playback is waiting for a browser gesture:', error);
            audio.controls = true;
            setStatusMessage('Voice is connected. Use the on-screen audio controls if playback is blocked.');
        });
    };
    const firebase = window.rungFirebase;
    const localUid = firebase.user.uid;
    const offerer = localUid < peerUid;
    if (offerer === initiate) {
        const signalUnsubscribe = firebase.listenVoiceSignal(onlineState.roomId, localUid, peerUid, async signal => {
            if (signal.sessionId !== state.sessionId || !signal.answer || state.appliedAnswer) return;
            state.appliedAnswer = true;
            try {
                await connection.setRemoteDescription(signal.answer);
            } catch (error) {
                console.error('Applying the voice answer failed:', error);
                showFirebaseError('The table voice connection could not be completed.');
            }
        }, error => console.error('Voice answer subscription failed:', error));
        state.unsubscribe = signalUnsubscribe;
        onlineState.voiceUnsubscribes.push(signalUnsubscribe);
        connection.createOffer()
            .then(offer => connection.setLocalDescription(offer))
            .then(() => waitForIceGathering(connection))
            .then(() => firebase.writeVoiceOffer(
                onlineState.roomId, localUid, peerUid, connection.localDescription.toJSON(), state.sessionId
            ))
            .catch(error => {
                console.error('Creating the voice offer failed:', error);
                showFirebaseError('Voice connection could not be started.');
            });
    } else {
        const signalUnsubscribe = firebase.listenVoiceSignal(onlineState.roomId, peerUid, localUid, async signal => {
            const sessionKey = `rung-voice-session:${onlineState.roomId}:${peerUid}:${localUid}`;
            const lastSessionId = localStorage.getItem(sessionKey);
            if (!signal.offer || !signal.sessionId) return;
            if (state.appliedOffer && signal.sessionId !== state.sessionId) {
                resetVoicePeer(peerUid, state);
                scheduleVoiceSignal(peerUid, true);
                return;
            }
            if (signal.sessionId === lastSessionId || state.appliedOffer) return;
            state.appliedOffer = true;
            state.sessionId = signal.sessionId;
            state.signalId = signal.signalId;
            try {
                await connection.setRemoteDescription(signal.offer);
                const answer = await connection.createAnswer();
                await connection.setLocalDescription(answer);
                await waitForIceGathering(connection);
                await firebase.writeVoiceAnswer(
                    onlineState.roomId, state.signalId, connection.localDescription.toJSON()
                );
                localStorage.setItem(sessionKey, state.sessionId);
            } catch (error) {
                state.appliedOffer = false;
                console.error('Answering a voice connection failed:', error);
                showFirebaseError('Voice connection could not be completed.');
            }
        }, error => console.error('Voice offer subscription failed:', error));
        state.unsubscribe = signalUnsubscribe;
        onlineState.voiceUnsubscribes.push(signalUnsubscribe);
    }
}

function resetVoicePeer(peerUid, expectedPeer = null) {
    const peer = onlineState.voicePeers.get(peerUid);
    if (!peer || (expectedPeer && peer !== expectedPeer)) return;
    peer.connection.close();
    peer.unsubscribe?.();
    onlineState.voiceUnsubscribes = onlineState.voiceUnsubscribes
        .filter(unsubscribe => unsubscribe !== peer.unsubscribe);
    onlineState.voicePeers.delete(peerUid);
    $(`#voice-audio-${peerUid}`).remove();
}

function syncVoicePeers(room) {
    if (!onlineState.voiceStream || !window.rungFirebase) return;
    const currentUids = new Set((room.seats || [])
        .filter(seat => seat.uid)
        .map(seat => seat.uid)
        .filter(uid => uid !== window.rungFirebase.user.uid));
    onlineState.voicePeers.forEach((peer, uid) => {
        if (currentUids.has(uid)) return;
        resetVoicePeer(uid);
    });
    currentUids.forEach(uid => scheduleVoiceSignal(uid, true));
}

function waitForIceGathering(connection) {
    if (connection.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise(resolve => {
        const timeout = setTimeout(resolve, 7000);
        connection.addEventListener('icegatheringstatechange', () => {
            if (connection.iceGatheringState === 'complete') {
                clearTimeout(timeout);
                resolve();
            }
        });
    });
}

async function toggleVoice() {
    if (!onlineState.roomId || onlineState.isViewer) return;
    const button = $('#voice-toggle-btn');
    if (onlineState.voiceStream) {
        onlineState.voiceStream.getTracks().forEach(track => track.stop());
        onlineState.voiceStream = null;
        onlineState.voicePeers.forEach(peer => peer.connection.close());
        onlineState.voicePeers.clear();
        onlineState.voiceUnsubscribes.forEach(unsubscribe => unsubscribe());
        onlineState.voiceUnsubscribes = [];
        $('audio[id^="voice-audio-"]').remove();
        button.text('Join voice').attr('aria-pressed', 'false').removeClass('is-voice-connected');
        return;
    }
    try {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('This browser does not support microphone access.');
        }
        if (typeof RTCPeerConnection !== 'function') {
            throw new Error('This browser does not support WebRTC voice.');
        }
        onlineState.voiceStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
        button.text('Leave voice').attr('aria-pressed', 'true').addClass('is-voice-connected');
        syncVoicePeers(onlineState.room || { seats: [] });
        setStatusMessage('Microphone is on. Voice will connect to seated players at this table.');
    } catch (error) {
        console.error('Microphone access failed:', error);
        showFirebaseError(error.message || 'Microphone permission was denied or no microphone is available.');
    }
}

// Make initializeGame async so we can await the animated deal
async function initializeGame() {
	try {
        rulesAreOpen = false;
        $('#celebration').hide();
        onlineState.dealCompleted = false;
        onlineState.activeTrumpPrompt = false;
        $('#bot-banter-log').html('<p class="bot-banter-empty">Bot banter will appear here during the game.</p>');
		// Reset game state
		if (!onlineState.roomId) {
			gameState.players.slice(1).forEach(player => {
				player.isBot = true;
				player.name = nextBotName(player.id);
			});
		}
        onlineState.endGameResult = null;
        $('#end-game-btn').prop('hidden', true).prop('disabled', false).text('End Game');
        gameState.botBanter = null;
        gameState.botBanterLog = [];
        onlineState.lastBotBanterId = null;
		gameState.deck = [];
		gameState.players.forEach(player => {
			player.cards = [];
			player.tricks = 0;
		});
		gameState.currentPlayer = 0;
		gameState.trumpSuit = null;
        gameState.trumpChooserId = gameState.nextTrumpChooserId || 1;
		gameState.ledSuit = null;
		gameState.trickCards = [];
		gameState.trickWinner = null;
		gameState.handsPlayed = 0;
		closeTrumpSelection();
		gameState.gameState = "TRUMP_SELECTION";
		gameState.team1Points = 0;
		gameState.team2Points = 0;
		gameState.team1Consecutive = 0;
		gameState.team2Consecutive = 0;
		gameState.tableCards = [];
		gameState.handIndex = 0;
		gameState.handWinners = [];
		gameState.stackedPoints = 0;
		gameState.currentStake = gameState.scoringMode === 'two_plus' ? 2 : 1;
		gameState.consecutiveWins = 0;
		gameState.totalHandsPlayed = 0;
		gameState.lastHandWinnerId = null;
		// reset history
		gameState.playHistory = [];
		gameState.lastPlayedByPlayer = {1: [], 2: [], 3: [], 4: []};
		gameState.lastPlayInfoByPlayer = {1:null,2:null,3:null,4:null};
		clearTimeout(gameState.reactionTimer);
		clearTimeout(gameState.announcementTimer);
		gameState.reactionTimer = null;
		gameState.announcementTimer = null;
		$('.player-reaction').remove();
		$('#table-announcement').removeClass('is-visible').empty();
		// reset z-order counters
		gameState.playSeqCounter = 0;
		gameState.playCountByPlayer = {1:0,2:0,3:0,4:0};
		gameState.lastPlayedPlayerId = null;

		// Remove any existing history UI from previous games
		$('.last-played-list').remove();

		// IMPORTANT: do NOT pre-seed any virtual prior wins; leave challenge to be started
		gameState.initialLeadTeam = null;
		gameState.currentChallengeTeam = null;
		gameState.leadHolderPlayerId = null;
		gameState.stake1Completed = gameState.scoringMode === 'two_plus';
		setScoringMode(gameState.scoringMode);

		// Create and shuffle deck
		createDeck();
		shuffleDeck();
		
		// Deal cards (animated with small delay) - now deal first 5 to each, ask human to select trump, then finish dealing
		setStatusMessage('Dealing cards...');
		await dealCards(); // updated dealCards handles initial pause for trump selection

		// After deal completed, sort hands for readability
		gameState.players.forEach(player => {
			player.cards.sort((a, b) => {
				if (a.suit !== b.suit) {
					return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
				}
				return RANK_VALUES[a.rank] - RANK_VALUES[b.rank];
			});
		});

		// Update UI
		updateUI();

		// Ensure game-table and trick area use relative positioning for correct absolute placement
		$('.game-table').css('position', 'relative');
		$('.trick-area').css('position', 'relative');

		// Initialize/clean history panels (safe)
		ensurePlayerHistoryUI();

		// Clear hand winners list
		$('#hand-winners-list').empty();
		
		// Only show initial lead message if we are still waiting for trump selection
		if (gameState.gameState === "TRUMP_SELECTION") {
		    setStatusMessage("Team 1 has initial lead (UI only). Please select trump...");
		}
		// trump selection and starting the first hand are handled by dealCards/selectTrump/startTurn
	} catch (err) {
		console.error('initializeGame failed:', err);
		setStatusMessage('Error initializing game. See console.');
        throw err;
	}
}

function createDeck() {
    gameState.deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            gameState.deck.push({ suit, rank });
        }
    }
}

function shuffleDeck() {
    for (let i = gameState.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [gameState.deck[i], gameState.deck[j]] = [gameState.deck[j], gameState.deck[i]];
    }
}

// Replace dealCards with a two-phase async deal
async function dealCards() {
    // Ensure deck exists
    if (!gameState.deck || gameState.deck.length !== 52) {
        createDeck();
        shuffleDeck();
    }

    // Clear any previous hands
    gameState.players.forEach(p => p.cards = []);

    // Phase 1: deal first 5 cards to each player (20 cards)
    for (let i = 0; i < 20; i++) {
        const playerIndex = i % 4;
        const card = gameState.deck[i];
        gameState.players[playerIndex].cards.push(card);
        if ((i + 1) % 4 === 0) {
            updateUI();
            await sleep(70);
        }
    }

    const trumpChooser = gameState.players.find(player => player.id === gameState.trumpChooserId);
    if (!trumpChooser) {
        throw new Error(`Trump chooser ${gameState.trumpChooserId} is not a valid player`);
    }

    gameState.gameState = "TRUMP_SELECTION";
    if (onlineState.isHost) {
        await publishOnlineState(true);
        onlineState.hasStarted = true;
    }
    if (trumpChooser.isHuman) {
        setStatusMessage(gameState.lastWinningTeam
            ? 'Your team won the last game. Choose the trump suit.'
            : 'Choose the trump suit to start the game.');
        const chosenSuit = await waitForTrumpSelection(trumpChooser);
        selectTrump(chosenSuit, trumpChooser);
    } else {
        setStatusMessage(`${trumpChooser.name} is choosing trump for the winning team...`);
        closeTrumpSelection();
        await sleep(600);
        selectTrump(chooseTrumpSuit(trumpChooser), trumpChooser);
    }

    // Phase 2: deal remaining cards (cards 21..52)
    for (let i = 20; i < gameState.deck.length; i++) {
        const playerIndex = i % 4;
        const card = gameState.deck[i];
        gameState.players[playerIndex].cards.push(card);
        if ((i + 1) % 4 === 0 || i === gameState.deck.length - 1) {
            updateUI();
            await sleep(45);
        }
    }

    // finished dealing
    setStatusMessage('Dealing complete.');
    onlineState.dealCompleted = true;

    // The player who chose trump leads the first hand.
    gameState.currentPlayer = gameState.players.findIndex(player => player.id === gameState.trumpChooserId);
    if (gameState.currentPlayer < 0) {
        throw new Error(`Trump chooser ${gameState.trumpChooserId} is not a valid player`);
    }
    startTurn();
    scheduleRandomPlayerReaction();
}

// Wait for human to select trump via overlay. Resolves with selected suit string.
function waitForTrumpSelection(chooser) {
    if (onlineState.isHost && chooser.uid && chooser.uid !== window.rungFirebase.user.uid) {
        return new Promise(resolve => {
            let settled = false;
            const finish = suit => {
                if (settled) return;
                settled = true;
                onlineState.activeTrumpPrompt = false;
                clearTimeout(onlineState.turnTimer);
                onlineState.turnTimer = null;
                onlineState.turnTimerKey = null;
                onlineState.pendingTrumpChoice = null;
                resolve(suit);
            };
            onlineState.pendingTrumpChoice = finish;
            onlineState.turnTimer = setTimeout(() => {
                if (settled) return;
                onlineState.missedTurns[chooser.uid] = (onlineState.missedTurns[chooser.uid] || 0) + 1;
                if (onlineState.missedTurns[chooser.uid] >= MAX_MISSED_TURNS) {
                    replacePlayerWithBot(chooser);
                } else {
                    setStatusMessage(`${chooser.name} timed out choosing trump (${onlineState.missedTurns[chooser.uid]}/${MAX_MISSED_TURNS}); a suit was selected automatically.`);
                }
                finish(chooseTrumpSuit(chooser));
            }, ONLINE_TURN_TIMEOUT_MS);
        });
    }
	return new Promise((resolve) => {
        let settled = false;
        const finish = suit => {
            if (settled) return;
            settled = true;
            onlineState.activeTrumpPrompt = false;
            clearTimeout(onlineState.turnTimer);
            onlineState.turnTimer = null;
            onlineState.turnTimerKey = null;
            resolve(suit);
        };
		$('#trump-selection-title').text(gameState.lastWinningTeam
			? `${chooser.name}, choose trump for the winning team`
			: `${chooser.name}, choose the trump suit`);
		$('.game-table').addClass('is-trump-selection');
        onlineState.activeTrumpPrompt = true;
        openTrumpSelection();
		$('#trump-selection .trump-btn').off('click.trumpSelect').on('click.trumpSelect', function() {
			const suit = $(this).attr('data-suit');
            if (chooser?.uid) onlineState.missedTurns[chooser.uid] = 0;
			finish(suit);
		});
        if (onlineState.isHost && chooser.uid) {
            onlineState.turnTimer = setTimeout(() => {
                if (settled) return;
                onlineState.missedTurns[chooser.uid] = (onlineState.missedTurns[chooser.uid] || 0) + 1;
                if (onlineState.missedTurns[chooser.uid] >= MAX_MISSED_TURNS) {
                    replacePlayerWithBot(chooser);
                } else {
                    setStatusMessage(`${chooser.name} timed out choosing trump (${onlineState.missedTurns[chooser.uid]}/${MAX_MISSED_TURNS}); a suit was selected automatically.`);
                }
                finish(chooseTrumpSuit(chooser));
            }, ONLINE_TURN_TIMEOUT_MS);
        }
	});
}

// Called when trump chosen (either via waitForTrumpSelection resolver or other)
function selectTrump(suit, chooser) {
	if (!SUITS.includes(suit)) {
		throw new Error(`Invalid trump suit: ${suit}`);
	}
	// set game-wide trump and hide overlay
	gameState.trumpSuit = suit;
	// keep gameState as PLAYING once trump is set
	gameState.gameState = "PLAYING";
    onlineState.activeTrumpPrompt = false;
    onlineState.pendingAction = false;
	$('.game-table').removeClass('is-trump-selection');
	closeTrumpSelection();
    onlineState.activeTrumpPrompt = false;
    onlineState.pendingAction = false;
    $('#trump-selection .trump-btn').prop('disabled', false);
	setStatusMessage(`${chooser ? chooser.name : 'Your team'} selected ${SUIT_SYMBOLS[suit]} as trump. Dealing remaining cards...`);
	updateUI();
	// Do not start turn here; dealCards will call startTurn() after finishing the full deal
}

function chooseTrumpSuit(player) {
	const suitCounts = Object.fromEntries(SUITS.map(suit => [suit, 0]));
	player.cards.forEach(card => {
		suitCounts[card.suit] += 1;
	});
	return SUITS.reduce((bestSuit, suit) =>
		suitCounts[suit] > suitCounts[bestSuit] ? suit : bestSuit, SUITS[0]);
}

// Update UI
function updateUI() {
    const localSeatIndex = getLocalPerspectiveSeatIndex();
    const localTeam = gameState.players[localSeatIndex]?.team || 1;
    const opposingTeam = localTeam === 1 ? 2 : 1;
    const localTeamPlayers = gameState.players.filter(player => player.team === localTeam);
    const opposingTeamPlayers = gameState.players.filter(player => player.team === opposingTeam);
    $('#team1-label').text(`Team 1 (${localTeamPlayers.map(player => player.name).join(' & ')})`);
    $('#team2-label').text(`Team 2 (${opposingTeamPlayers.map(player => player.name).join(' & ')})`);

    // Render the local seat at the bottom and preserve the table's anti-clockwise order.
    for (let displaySlot = 0; displaySlot < 4; displaySlot++) {
        const playerIndex = getCanonicalSeatIndex(displaySlot);
        const player = gameState.players[playerIndex];
        const cardArea = $(`#player${displaySlot + 1}-cards`);
        cardArea.empty();
        const playerArea = cardArea.closest('.player-area');
        const isLocalSeat = !onlineState.isViewer && playerIndex === localSeatIndex;
        const displayTeam = getDisplayTeamNumber(player.team);
        const needsYouTag = isLocalSeat && !/^you$/i.test(String(player.name || '').trim());
        const isSeniorLeadHolder = gameState.stackedPoints > 0 && player.id === gameState.leadHolderPlayerId;
        const isTrickLeader = gameState.trickCards.length > 0 && gameState.trickCards[0].player === player.id;
        const isLeadingHandUser = isSeniorLeadHolder || isTrickLeader;
        const isCurrentTurn = gameState.gameState === "PLAYING" && playerIndex === gameState.currentPlayer;
        const nameEl = playerArea.find('.player-name').empty();
        nameEl.append(document.createTextNode(
            `${player.name}${needsYouTag ? ' (You)' : ''} (Team ${displayTeam})${isSeniorLeadHolder ? ' 👑 Lead' : (isTrickLeader ? ' 🎯 Lead' : '')}`
        ));
        if (player.isBot && playerIndex > 0 && (onlineState.isHost || !onlineState.roomId)) {
            const isKickedReady = onlineState.kickedBotSeats?.has(playerIndex);
            const kickBtn = $('<button type="button" class="inline-kick-bot-btn"></button>')
                .attr('data-kick-bot-seat', playerIndex)
                .attr('title', playerIndex === 2
                    ? 'Kick out bot and let your friend join as your partner'
                    : 'Kick out bot and let a friend take this seat')
                .text(isKickedReady ? 'Seat Open 📋' : (playerIndex === 2 ? 'Kick Bot (Partner)' : 'Kick Bot'));
            nameEl.append(' ').append(kickBtn);
        }
        playerArea.toggleClass('is-current-turn', isCurrentTurn);
        playerArea.toggleClass('is-lead-holder', isLeadingHandUser);
        playerArea.toggleClass('is-senior-lead', isSeniorLeadHolder);
        playerArea.toggleClass('last-played-player', player.id === gameState.lastPlayedPlayerId);
        const cornerHistoryPanel = $(`#player${displaySlot + 1}-history`);
        cornerHistoryPanel.toggleClass('is-lead-holder', isLeadingHandUser);
        cornerHistoryPanel.toggleClass('is-current-turn', isCurrentTurn);
        
        const shouldShowCards = !onlineState.isViewer && playerIndex === localSeatIndex;
        if (shouldShowCards) {
            positionCardsInFan(player.cards, displaySlot, cardArea);
        } else {
            // Show card backs for AI players
            positionCardBacksInFan(player.cards.length, displaySlot, cardArea);
        }
        
        // removed card-count indicator - it overlapped cards on small screens and was redundant
    }
    
    // Update trump indicator
    const trumpIndicator = $('#trump-indicator');
    if (gameState.trumpSuit) {
        const suitSymbol = SUIT_SYMBOLS[gameState.trumpSuit];
        const colorClass = (gameState.trumpSuit === 'hearts' || gameState.trumpSuit === 'diamonds') ? 'suit-red' : 'suit-black';
        trumpIndicator.html(`Trump: <span class="${colorClass}">${suitSymbol}</span>`);
    } else {
        trumpIndicator.html('Trump: Not selected');
    }
    
    // Update led suit indicator
    const ledSuitIndicator = $('#led-suit-indicator');
    if (gameState.ledSuit) {
        const suitSymbol = SUIT_SYMBOLS[gameState.ledSuit];
        const colorClass = (gameState.ledSuit === 'hearts' || gameState.ledSuit === 'diamonds') ? 'suit-red' : 'suit-black';
        ledSuitIndicator.html(`Led Suit: <span class="${colorClass}">${suitSymbol}</span>`);
    } else {
        ledSuitIndicator.html('');
    }
    
    // Update table cards count & senior lead holder / hype stack info
    const totalCardsOnTable = gameState.tableCards.length + gameState.trickCards.length;
    const leadHolder = gameState.stackedPoints > 0
        ? gameState.players.find(p => p.id === gameState.leadHolderPlayerId)
        : null;
    const hypePrefix = gameState.stackedPoints >= 3 ? '🔥 ' : '';
    const leadInfo = leadHolder ? ` · ${hypePrefix}Stack: ${gameState.stackedPoints} pts (Lead: ${leadHolder.name})` : '';
    $('#table-cards-count').text(`Cards on table: ${totalCardsOnTable}${leadInfo}`);
    
    // Update scores
    const localPoints = localTeam === 1 ? gameState.team1Points : gameState.team2Points;
    const opposingPoints = localTeam === 1 ? gameState.team2Points : gameState.team1Points;
    const localConsecutive = localTeam === 1 ? gameState.team1Consecutive : gameState.team2Consecutive;
    const opposingConsecutive = localTeam === 1 ? gameState.team2Consecutive : gameState.team1Consecutive;
    $('#team1-points').text(localPoints);
    $('#team2-points').text(opposingPoints);
    $('#team1-consecutive').text(localConsecutive);
    $('#team2-consecutive').text(opposingConsecutive);
    
    // Update stacked points
    $('#stacked-points').text(gameState.stackedPoints);
    
    // Update hands played
    $('#hands-played').text(`Hands played: ${gameState.totalHandsPlayed}`);
    
    // Update current player
    const currentPlayerName = gameState.players[gameState.currentPlayer].name;
    $('#current-player').text(`Current: ${currentPlayerName}`);
    
    // Update cards remaining
    const humanCards = onlineState.isViewer ? 0 : gameState.players[localSeatIndex].cards.length;
    $('#cards-remaining').text(`Cards in hand: ${humanCards}`);
    
    // Update stake display and top-bar live controls
    const mode = gameState.scoringMode || 'classic_3_2';
    if (mode === 'single_hand') {
        $('#stake-display').text('1 Pt/Hand');
        $('#current-stake').text('Rule: Single Hand Winner = 1 Point');
    } else if (mode === 'two_plus') {
        $('#stake-display').text('2+ Hands');
        $('#current-stake').text('Rule: 2 or 2+ Hands Winner Wins Points');
    } else {
        $('#stake-display').text(gameState.currentStake);
        $('#current-stake').text(
            `Stake ${gameState.currentStake} (${gameState.currentStake === 1 ? '1st 3 Hands = 3 Pts, then 2+ Hands' : '2 or 2+ Hands Winner Wins Points'})`
        );
    }
    const hasBots = gameState.players.slice(1).some(p => p.isBot);
    $('#top-kick-bot-btn').prop('hidden', !(onlineState.isHost || !onlineState.roomId) || !hasBots);
    const tableCode = onlineState.room?.tableCode || onlineState.room?.inviteCode || '';
    $('#live-table-badge')
        .prop('hidden', !tableCode)
        .text(tableCode ? `Table ID: ${tableCode} 📋` : '');
    const viewerCanTakeBot = onlineState.isViewer && Boolean(onlineState.room?.seats?.some(s => s.isBot));
    $('#viewer-take-seat-btn').prop('hidden', !viewerCanTakeBot);
    
    // Ensure game-table and trick area use relative positioning for correct absolute placement
    $('.game-table').css('position', 'relative');
    $('.trick-area').css('position', 'relative');

    // Initialize/clean history panels (safe)
    ensurePlayerHistoryUI();
    publishOnlineState();
}

// Robust: ensure one dedicated history panel per player, always as a child of .game-table
function ensurePlayerHistoryUI() {
	const table = $('.game-table');
	if (!table.length) return;

	// Ensure .game-table is positioned so absolute panels align correctly
	if (table.css('position') === 'static') {
		table.css('position', 'relative');
	}

	for (let pid = 1; pid <= 4; pid++) {
		// Remove duplicate panels if any, keep the first
		const existing = $(`#player${pid}-history`);
		if (existing.length > 1) {
			existing.slice(1).remove();
		}

		let panel = $(`#player${pid}-history`).first();
		if (!panel.length) {
			panel = $(`<div id="player${pid}-history" class="player-history-panel" data-player="${pid}"></div>`);
			table.append(panel);
		} else {
			// If panel exists but is not a child of .game-table, move it
			if (!panel.parent().is(table)) {
				panel.appendTo(table);
			}
		}

		// Apply accessibility role
		panel.attr('role', 'log');

		// Position per player (kept in CSS but ensure defaults here)
		// (CSS file contains final positioning rules; we keep JS idempotent)
		renderPlayerHistory(pid);
	}
}

// Render history into a dedicated panel. Most recent first. Defensive about missing data.
function renderPlayerHistory(playerId) {
	const displaySlot = getDisplaySeatIndex(playerId - 1) + 1;
	const panel = $(`#player${displaySlot}-history`);
	if (!panel.length) return;

	panel.empty();

	const arr = gameState.lastPlayedByPlayer[playerId] || [];
	const lastPlay = gameState.lastPlayInfoByPlayer[playerId];
	const card = arr[arr.length - 1] || lastPlay?.card;
	if (!card) {
		panel.append($('<div class="history-empty">—</div>'));
		return;
	}

	const suitSymbol = SUIT_SYMBOLS[card.suit] || '';
	const colorClass = (card.suit === 'hearts' || card.suit === 'diamonds') ? 'suit-red' : 'suit-black';
	const playNumber = lastPlay ? lastPlay.playNumber : '–';
	const item = $('<div class="mini-play"></div>');
	item.attr('title', `Last play #${playNumber}: ${card.rank} ${card.suit}`);
	item.append($('<span class="play-log-number"></span>').text(`#${playNumber}`));
	item.append($(`<strong class="${colorClass}"></strong>`).text(`${card.rank}${suitSymbol}`));
	panel.append(item);
}

function closeReactionPicker() {
	$('#chat-picker').prop('hidden', true);
	$('#chat-toggle-btn').attr('aria-expanded', 'false');
}

function renderCustomEmojis() {
	const container = $('#custom-emojis').empty();
	gameState.customEmojis.forEach(emoji => {
		const button = $('<button class="reaction-choice emoji-choice" type="button"></button>');
		button.attr('data-reaction', emoji).attr('aria-label', `Send ${emoji}`).text(emoji);
		container.append(button);
	});
}

function showTableAnnouncement(text, durationMs = 3000) {
	// Middle-of-screen short popup disabled per user request; corner play boxes and leading tracing border show live state.
	const announcement = $('#table-announcement');
	if (announcement.length) {
		announcement.removeClass('is-visible').prop('hidden', true);
	}
}

function renderIncomingReaction(entry) {
	if (!entry || entry.id === onlineState.lastReactionId) return;
	onlineState.lastReactionId = entry.id;
	showPlayerReaction(entry.playerId, entry.text);
	const isLocal = entry.playerId === getLocalPerspectiveSeatIndex() + 1;
	showTableAnnouncement(`${isLocal ? 'You' : (entry.playerName || 'Player')}: ${entry.text}`, 3000);
}

function broadcastReaction(message) {
	const reaction = String(message || '').trim().slice(0, 80);
	if (!reaction) return;

	const localPlayerId = getLocalPerspectiveSeatIndex() + 1;
	const localPlayer = gameState.players[localPlayerId - 1];
	const entry = {
		id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		playerId: localPlayerId,
		playerName: localPlayer?.name || 'You',
		text: reaction
	};
	renderIncomingReaction(entry);
	closeReactionPicker();

	if (onlineState.isHost && onlineState.roomId) {
		gameState.lastReaction = entry;
		publishOnlineState(true);
	} else if (onlineState.isReplica && onlineState.roomId) {
		const seatIdx = onlineState.isViewer ? -1 : onlineState.seatIndex;
		firebaseApi().then(firebase =>
			firebase.submitAction(onlineState.roomId, seatIdx, reaction, 'reaction', currentPlayerName())
		).catch(error => console.error('Sending reaction failed:', error));
	}
}

function showPlayerReaction(playerId, reaction) {
	const player = gameState.players.find(item => item.id === playerId);
	const displaySlot = getDisplaySeatIndex(playerId - 1) + 1;
	const playerArea = $(`#player${displaySlot}-cards`).closest('.player-area');
	if (!player || !playerArea.length) return;

	playerArea.find('.player-reaction').remove();
	const bubble = $('<div class="player-reaction" role="status"></div>')
		.text(reaction)
		.attr('aria-label', `${player.name}: ${reaction}`);
	playerArea.append(bubble);
	setTimeout(() => bubble.remove(), 2800);
}

function scheduleRandomPlayerReaction() {
	clearTimeout(gameState.reactionTimer);
	if (gameState.gameState !== 'PLAYING') return;

	gameState.reactionTimer = setTimeout(() => {
		if (gameState.gameState !== 'PLAYING') return;
		const aiPlayers = gameState.players.filter(player => !player.isHuman);
		const player = aiPlayers[Math.floor(Math.random() * aiPlayers.length)];
		const reaction = AI_REACTIONS[Math.floor(Math.random() * AI_REACTIONS.length)];
		showPlayerReaction(player.id, reaction);
		scheduleRandomPlayerReaction();
	}, 9000 + Math.floor(Math.random() * 7000));
}

function positionCardsInFan(cards, playerIndex, cardArea) {
    const cardCount = cards.length;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const maxFanAngle = isMobile ? 60 : 75;
    const fanAngle = Math.min(maxFanAngle, cardCount * 5);
    const startAngle = -fanAngle / 2;
    const angleStep = fanAngle / (cardCount - 1 || 1);
    const centerIndex = (cardCount - 1) / 2;
    const horizontalSpacing = isMobile
        ? Math.min(20, Math.max(14, (window.innerWidth - 60) / Math.max(cardCount - 1, 1)))
        : 15;
    const verticalSpacing = isMobile ? 16 : 12;
    
    cards.forEach((card, index) => {
        const cardElement = createCardElement(card, playerIndex === 0);
        
        switch(playerIndex) {
            case 0: // Bottom player - horizontal fan
                const rotBottom = startAngle + (index * angleStep);
                const translateXBottom = (index - centerIndex) * horizontalSpacing;
                cardElement.css({
                    transform: `rotate(${rotBottom}deg) translateX(${translateXBottom}px)`,
                    zIndex: index
                });
                break;
                
            case 1: // Left player - vertical fan facing center
                const rotLeft = 90 - startAngle - (index * angleStep);
                const translateXLeft = (centerIndex - index) * verticalSpacing;
                cardElement.css({
                    transform: `rotate(${rotLeft}deg) translateX(${translateXLeft}px)`,
                    zIndex: index
                });
                break;
                
            case 2: // Top player - horizontal fan (rotated 180°)
                const rotTop = 180 + startAngle + (index * angleStep);
                const translateXTop = (index - centerIndex) * horizontalSpacing;
                cardElement.css({
                    transform: `rotate(${rotTop}deg) translateX(${translateXTop}px)`,
                    zIndex: index
                });
                break;
                
            case 3: // Right player - vertical fan facing center
                const rotRight = 270 + startAngle + (index * angleStep);
                const translateXRight = (index - centerIndex) * verticalSpacing;
                cardElement.css({
                    transform: `rotate(${rotRight}deg) translateX(${translateXRight}px)`,
                    zIndex: index
                });
                break;
        }
        
        cardArea.append(cardElement);
    });
}

function positionCardBacksInFan(cardCount, playerIndex, cardArea) {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const maxFanAngle = isMobile ? 60 : 75;
    const fanAngle = Math.min(maxFanAngle, cardCount * 5);
    const startAngle = -fanAngle / 2;
    const angleStep = fanAngle / (cardCount - 1 || 1);
    const centerIndex = (cardCount - 1) / 2;
    const horizontalSpacing = isMobile
        ? Math.min(20, Math.max(14, (window.innerWidth - 60) / Math.max(cardCount - 1, 1)))
        : 15;
    const verticalSpacing = isMobile ? 16 : 12;
    
    for (let i = 0; i < cardCount; i++) {
        const cardElement = $('<div class="card card-back"></div>');
        
        switch(playerIndex) {
            case 0: // Bottom player
                const rotationBottom = startAngle + (i * angleStep);
                const translateXBottom = (i - centerIndex) * horizontalSpacing;
                cardElement.css({
                    transform: `rotate(${rotationBottom}deg) translateX(${translateXBottom}px)`,
                    zIndex: i
                });
                break;
                
            case 1: // Left player
                const rotationLeft = 90 - startAngle - (i * angleStep);
                const translateXLeft = (centerIndex - i) * verticalSpacing;
                cardElement.css({
                    transform: `rotate(${rotationLeft}deg) translateX(${translateXLeft}px)`,
                    zIndex: i
                });
                break;
                
            case 2: // Top player
                const rotationTop = 180 + startAngle + (i * angleStep);
                const translateXTop = (i - centerIndex) * horizontalSpacing;
                cardElement.css({
                    transform: `rotate(${rotationTop}deg) translateX(${translateXTop}px)`,
                    zIndex: i
                });
                break;
                
            case 3: // Right player
                const rotationRight = 270 + startAngle + (i * angleStep);
                const translateXRight = (i - centerIndex) * verticalSpacing;
                cardElement.css({
                    transform: `rotate(${rotationRight}deg) translateX(${translateXRight}px)`,
                    zIndex: i
                });
                break;
        }
        
        cardArea.append(cardElement);
    }
}
function createCardElement(card, isClickable) {
    const suitSymbol = SUIT_SYMBOLS[card.suit];
    const colorClass = (card.suit === 'hearts' || card.suit === 'diamonds') ? 'suit-red' : 'suit-black';
    
    const cardElement = $('<div class="card"></div>');
    if (isClickable) {
        cardElement.addClass('clickable');
    }
    
    cardElement.html(`
        <div class="card-top">
            <div class="card-rank ${colorClass}">${card.rank}</div>
            <div class="card-suit ${colorClass}">${suitSymbol}</div>
        </div>
        <div class="card-center ${colorClass}">${suitSymbol}</div>
        <div class="card-bottom">
            <div class="card-rank ${colorClass}">${card.rank}</div>
            <div class="card-suit ${colorClass}">${suitSymbol}</div>
        </div>
    `);
    
    if (isClickable) {
        cardElement.click(function() {
            handleCardClick(card);
        });
    }
    
    return cardElement;
}

function handleCardClick(card) {
    if (gameState.trickCards.length >= 4) return;
    const currentPlayer = gameState.players[gameState.currentPlayer];
    if (!currentPlayer) return;
    if (onlineState.isReplica) {
        if (onlineState.isViewer || onlineState.pendingAction ||
            gameState.gameState !== 'PLAYING' || gameState.currentPlayer !== onlineState.seatIndex) return;
        if (!isValidPlay(card, currentPlayer)) {
            setStatusMessage('You must follow suit if possible!');
            return;
        }
        onlineState.pendingAction = true;
        // Optimistic 0ms UI update so card play feels instant on Apple/mobile & desktop devices
        const cardIdx = currentPlayer.cards.findIndex(c => c.suit === card.suit && c.rank === card.rank);
        const removedCard = cardIdx !== -1 ? currentPlayer.cards.splice(cardIdx, 1)[0] : null;
        gameState.trickCards.push({
            card: { suit: card.suit, rank: card.rank },
            player: currentPlayer.id,
            sequence: gameState.trickCards.length + 1
        });
        if (gameState.trickCards.length === 1) {
            gameState.ledSuit = card.suit;
        }
        gameState.currentPlayer = (gameState.currentPlayer + 3) % 4;
        gameState.lastPlayedPlayerId = currentPlayer.id;
        updateUI();
        renderReplicaTrick();
        const nextPlayerName = gameState.players[gameState.currentPlayer]?.name || 'Next player';
        setStatusMessage(`${nextPlayerName} is playing…`);

        firebaseApi().then(firebase =>
            firebase.submitAction(onlineState.roomId, onlineState.seatIndex, card)
        ).catch(error => {
            console.error('Submitting your card failed:', error);
            if (removedCard) currentPlayer.cards.push(removedCard);
            gameState.currentPlayer = onlineState.seatIndex;
            onlineState.pendingAction = false;
            updateUI();
            renderReplicaTrick();
            setStatusMessage('Your card could not be sent. Please try again.');
        });
        return;
    }
    
    if (gameState.gameState === "PLAYING" && currentPlayer.isHuman) {
        // Human playing a card
        if (isValidPlay(card, currentPlayer)) {
            playCard(card, currentPlayer);
        } else {
            setStatusMessage("You must follow suit if possible!");
        }
    }
}

function isValidPlay(card, player) {
    // If no suit has been led, any card is valid
    if (!gameState.ledSuit) return true;
    
    // If player has cards of the led suit, they must play one
    const hasLedSuit = player.cards.some(c => c.suit === gameState.ledSuit);
    if (hasLedSuit && card.suit !== gameState.ledSuit) {
        return false;
    }
    
    return true;
}

function playCard(card, player) {
    try {
        if (gameState.trickCards.length >= 4) {
            console.warn('playCard: trick already has 4 cards, waiting for determineHandWinner');
            return;
        }
        clearTimeout(onlineState.turnTimer);
        onlineState.turnTimer = null;
        onlineState.turnTimerKey = null;
        // Resolve player object from game state (player might be passed as object or index)
        const playerId = typeof player === 'object' ? player.id : player;
        const playerIndex = gameState.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) {
            console.error('playCard: player not found in gameState.players', player);
            return;
        }
        const playerObj = gameState.players[playerIndex];

        // Find card index by suit+rank (defensive: object identity may have changed)
        let cardIndex = playerObj.cards.findIndex(c => c.suit === card.suit && c.rank === card.rank);

        // Fallback: try matching by rank then suit or by rank only
        if (cardIndex === -1) {
            cardIndex = playerObj.cards.findIndex(c => c.rank === card.rank && c.suit === card.suit);
        }
        if (cardIndex === -1) {
            cardIndex = playerObj.cards.findIndex(c => c.rank === card.rank);
        }

        if (cardIndex !== -1) {
            // Remove card from player's hand
            playerObj.cards.splice(cardIndex, 1);
        } else {
            // Card not found - warn but continue (prevents hard error)
            console.warn(`playCard: Card ${card.rank} ${card.suit} not found in player ${playerObj.name}'s hand. Proceeding without removal.`);
        }

        // Push a shallow clone of the card into trickCards to avoid later mutation issues
        gameState.trickCards.push({
            card: { suit: card.suit, rank: card.rank },
            player: playerObj.id,
            sequence: gameState.trickCards.length + 1
        });

        // Set led suit if this is the first card of the trick
        if (gameState.trickCards.length === 1) {
            gameState.ledSuit = card.suit;
        }

        // Move anti-clockwise around the table: bottom -> right -> top -> left.
        gameState.currentPlayer = (gameState.currentPlayer + 3) % 4;
        gameState.lastPlayedPlayerId = playerObj.id;
        if (playerObj.isBot) maybeSpeakPunjabiBotLine(playerObj);

        // Update UI and show played card
        updateUI();

        // Safe display: use the existing function if present, otherwise call fallback in displayPlayedCard
        displayPlayedCard(card, playerObj.id);

        // If all players have played, determine hand winner
        if (gameState.trickCards.length === 4) {
            setTimeout(determineHandWinner, 650);
        } else {
            startTurn();
        }
    } catch (err) {
        console.error('playCard: unexpected error', err);
    }
}

function displayPlayedCard(card, playerOrId) {
    try {
        const playerId = (typeof playerOrId === 'object' && playerOrId !== null) ? playerOrId.id : playerOrId;
        const sequence = gameState.trickCards.length;
        // record and render per-player history (chronological)
        if (typeof addToPlayerHistory === 'function') {
            addToPlayerHistory(playerId, card);
        } else if (typeof window !== 'undefined' && typeof window.addToPlayerHistory === 'function') {
            window.addToPlayerHistory(playerId, card);
        } else {
            // Fallback: directly record into gameState and render
            gameState.playHistory = gameState.playHistory || [];
            gameState.playHistory.push({ playerId, card });
            gameState.lastPlayedByPlayer = gameState.lastPlayedByPlayer || {1:[],2:[],3:[],4:[]};
            gameState.lastPlayedByPlayer[playerId] = gameState.lastPlayedByPlayer[playerId] || [];
            gameState.lastPlayedByPlayer[playerId].push(card);
            // attempt to render panel if available
            if (typeof renderPlayerHistory === 'function') {
                try { renderPlayerHistory(playerId); } catch (err) { /* ignore */ }
            }
        }
        gameState.lastPlayInfoByPlayer[playerId] = { card, playNumber: sequence };
        renderPlayerHistory(playerId);

        // increment counters used to compute z-index
        gameState.playSeqCounter = (gameState.playSeqCounter || 0) + 1;
        gameState.playCountByPlayer[playerId] = (gameState.playCountByPlayer[playerId] || 0) + 1;

        const displaySeat = getDisplaySeatIndex(playerId - 1) + 1;
        const positions = { 1: 'bottom', 2: 'left', 3: 'top', 4: 'right' };
        const position = positions[displaySeat] || 'bottom';
        $('.trick-area .played-card.last-played-card').removeClass('last-played-card');
        const cardElement = createCardElement(card, false);
        cardElement.addClass('played-card last-played-card')
            .attr('data-player-id', playerId)
            .attr('data-play-number', sequence)
            .attr('aria-label', `${gameState.players.find(player => player.id === playerId).name} played ${card.rank} of ${card.suit}`)
            .attr('title', `${gameState.players.find(player => player.id === playerId).name} played ${card.rank} of ${card.suit}`);
        // Base rotation to match fan direction
        let rotation = 0;
        switch(position) {
            case 'bottom':
                rotation = 0;
                break;
            case 'left':
                rotation = 90;
                break;
            case 'top':
                rotation = 180;
                break;
            case 'right':
                rotation = 270;
                break;
        }
        cardElement.append(
            $('<span class="play-sequence"></span>')
                .text(sequence)
                .css('transform', `rotate(${-rotation}deg)`)
        );

        // Keep most of each played card on its player's side of the center.
        const cardLength = parseFloat(getComputedStyle(document.documentElement)
            .getPropertyValue('--card-height')) || 120;
        const inwardOffset = cardLength * 0.46;
        const directionOffset = {
            bottom: { x: 0, y: inwardOffset },
            left:   { x: -inwardOffset, y: 0 },
            top:    { x: 0, y: -inwardOffset },
            right:  { x: inwardOffset, y: 0 }
        };
        const dir = directionOffset[position] || { x: 0, y: 0 };

        const jitterX = Math.round((Math.random() * 6) - 3);
        const jitterY = Math.round((Math.random() * 6) - 3);

        // z-index
        const zIndex = 1000 + (gameState.playCountByPlayer[playerId] * 10) + gameState.playSeqCounter;

        cardElement.css({
            position: 'absolute',
            left: `calc(50% + ${dir.x + jitterX}px)`,
            top: `calc(50% + ${dir.y + jitterY}px)`,
            transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
            zIndex: zIndex
        });

        $('.trick-area').append(cardElement);
    } catch (err) {
        console.error('displayPlayedCard: unexpected error', err);
    }
}

function determineHandWinner() {
    let winningIndex = 0;
    let winningCard = gameState.trickCards[0].card;
    
    for (let i = 1; i < gameState.trickCards.length; i++) {
        const currentCard = gameState.trickCards[i].card;
        
        // If current winning card is not trump and this card is trump, this card wins
        if (winningCard.suit !== gameState.trumpSuit && currentCard.suit === gameState.trumpSuit) {
            winningIndex = i;
            winningCard = currentCard;
        }
        // If both are trump or both are not trump, compare values
        else if ((winningCard.suit === gameState.trumpSuit && currentCard.suit === gameState.trumpSuit) ||
                 (winningCard.suit !== gameState.trumpSuit && currentCard.suit !== gameState.trumpSuit && 
                  currentCard.suit === gameState.ledSuit)) {
            if (RANK_VALUES[currentCard.rank] > RANK_VALUES[winningCard.rank]) {
                winningIndex = i;
                winningCard = currentCard;
            }
        }
    }
    
    // Award the hand to the winning player's team
    const winningPlayerId = gameState.trickCards[winningIndex].player;
    const winningPlayer = gameState.players.find(p => p.id === winningPlayerId);
    const winningTeam = winningPlayer.team;
    gameState.lastHandWinnerId = winningPlayerId;
    
    // Add all trick cards to table cards (keep them on the table until a team wins the round)
    gameState.trickCards.forEach(trick => {
        gameState.tableCards.push({
            suit: trick.card.suit,
            rank: trick.card.rank,
            card: { suit: trick.card.suit, rank: trick.card.rank },
            player: trick.player,
            sequence: trick.sequence
        });
    });
    $('.trick-area .played-card').addClass('stacked-table-card').removeClass('last-played-card');
    
    gameState.handsPlayed += 1;
    gameState.totalHandsPlayed += 1;
    gameState.handIndex = Math.floor(gameState.tableCards.length / 4);
    
    // Clear current trick array before handleScoring so updateUI() inside handleScoring/resetTable
    // reports the exact number of cards remaining on the table (0 if resetTable() was triggered)
    gameState.trickCards = [];
    gameState.ledSuit = null;

    // Handle scoring based on the new rules — pass winningPlayerId so scoring knows which partner holds lead
    const scoringOutcome = handleScoring(winningTeam, winningPlayerId);
    
    // Update hand winners list (after handleScoring so consecutive streak is accurate)
    addHandWinner(winningPlayer.name, winningTeam, scoringOutcome?.wasConsecutive);
    
    const handWinSummary = scoringOutcome?.message ||
        `${winningPlayer.name} (Team ${getDisplayTeamNumber(winningTeam)}) wins the hand!`;
    setStatusMessage(handWinSummary);
    showTableAnnouncement(handWinSummary, 2600);
    
    // Check if game is over (all cards played)
    const totalCardsRemaining = gameState.players.reduce((total, player) => total + player.cards.length, 0);
    if (totalCardsRemaining === 0) {
        endGame();
        return;
    }
    
    // Start new hand with winner leading — DO NOT clear .trick-area .played-card here!
    // Played cards remain on the table until a team wins the round and resetTable() is called.
    gameState.currentPlayer = gameState.players.findIndex(p => p.id === winningPlayerId);
    
    // Update UI and continue
    updateUI();
    
    startTurn(handWinSummary);
}

// Replace handleScoring with multi-mode scoring support:
// - single_hand: Single Hand Winner = 1 Point (every single hand won immediately awards 1 point)
// - classic_3_2: Round 1 lets any team take lead on Hand 1, awards points on winning 2nd & 3rd consecutive hand (stack >= 3), clears table & starts Round 2; Round 2+ awards points on any 2 consecutive hands (no 3rd hand needed)
// - two_plus: 2 or 2+ Hands Winner Wins Points from the start
function handleScoring(winningTeam, winningPlayerId) {
    const mode = gameState.scoringMode || 'classic_3_2';
    const winnerName = gameState.players.find(p => p.id === winningPlayerId)?.name || 'Player';
    const displayTeam = getDisplayTeamNumber(winningTeam);

    // Mode 1: Single Hand Winner = 1 Point
    if (mode === 'single_hand') {
        if (winningTeam === 1) {
            gameState.team1Points += 1;
        } else {
            gameState.team2Points += 1;
        }
        const wasSameTeam = gameState.currentChallengeTeam === winningTeam;
        resetTable();
        gameState.currentChallengeTeam = winningTeam;
        gameState.consecutiveWins = wasSameTeam ? (gameState.consecutiveWins + 1) : 1;
        gameState.leadHolderPlayerId = winningPlayerId;
        gameState.team1Consecutive = winningTeam === 1 ? gameState.consecutiveWins : 0;
        gameState.team2Consecutive = winningTeam === 2 ? gameState.consecutiveWins : 0;
        const message = `${winnerName} (Team ${displayTeam}) wins the hand and scores +1 point! (Score: ${gameState.team1Points}-${gameState.team2Points})`;
        setStatusMessage(message);
        updateUI();
        return { message, wasConsecutive: wasSameTeam };
    }

    // Add 1 point to the stack for this hand (classic_3_2 & two_plus modes)
    gameState.stackedPoints += 1;
    if (mode === 'two_plus') {
        gameState.currentStake = 2;
    }

    // If no active challenge team yet (1st hand of the round), let winning team take lead
    if (gameState.currentChallengeTeam === null) {
        gameState.currentChallengeTeam = winningTeam;
        gameState.consecutiveWins = 1;
        gameState.leadHolderPlayerId = winningPlayerId;
        gameState.team1Consecutive = (winningTeam === 1) ? 1 : 0;
        gameState.team2Consecutive = (winningTeam === 2) ? 1 : 0;
        const isRound2Plus = mode === 'two_plus' || gameState.currentStake === 2 || gameState.stake1Completed;
        const targetWins = isRound2Plus ? 2 : 3;
        const message = `${winnerName} (Team ${displayTeam}) takes the lead (Hand 1/${targetWins})! Cards stay on table · Stack: ${gameState.stackedPoints}`;
        setStatusMessage(message);
        updateUI();
        return { message, wasConsecutive: false };
    }

    // If same team wins again
    if (winningTeam === gameState.currentChallengeTeam) {
        const isSameSeniorPlayer = (gameState.leadHolderPlayerId === winningPlayerId);

        // Partner Overtake / Seniority Rule:
        // If the partner overtook the lead (e.g. partner led Q, opponent played K, and this player won with A),
        // this player becomes senior even over their own partner!
        // Cards and stacked points MUST stay on the table, and this new senior player must now lead
        // and win the next consecutive hand themselves to collect all stacked points on the table.
        if (!isSameSeniorPlayer) {
            gameState.leadHolderPlayerId = winningPlayerId;
            gameState.consecutiveWins = 1;
            gameState.team1Consecutive = (winningTeam === 1) ? 1 : 0;
            gameState.team2Consecutive = (winningTeam === 2) ? 1 : 0;

            const message = `${winnerName} (Team ${displayTeam}) took over the lead as senior! Cards stay on table (Stack: ${gameState.stackedPoints}) — ${winnerName} must win the next hand to collect all ${gameState.stackedPoints + 1} pts!`;
            setStatusMessage(message);
            updateUI();
            return { message, wasConsecutive: false };
        }

        // Same senior player held the lead and won a consecutive hand!
        gameState.consecutiveWins += 1;
        gameState.leadHolderPlayerId = winningPlayerId;

        // Update team-specific consecutive counters for UI
        if (winningTeam === 1) {
            gameState.team1Consecutive = gameState.consecutiveWins;
            gameState.team2Consecutive = 0;
        } else {
            gameState.team2Consecutive = gameState.consecutiveWins;
            gameState.team1Consecutive = 0;
        }

        // Round 1 (currentStake === 1):
        //   - Requires 3 hands played on the table (stackedPoints >= 3) AND the senior player winning 2nd & 3rd consecutive hand:
        //     * If the same senior player won Hand 1 & Hand 2 (stackedPoints === 2), requiredWins is 3 (must also win Hand 3).
        //     * Once stackedPoints >= 3 (Hand 3+), winning 2 consecutive hands by the same senior player claims the entire stack!
        // Round 2+ (currentStake === 2 or stake1Completed):
        //   - Condition is changed: any senior player who wins 2 consecutive hands immediately claims all stacked points.
        let requiredWins;
        if (mode === 'two_plus' || gameState.currentStake === 2 || gameState.stake1Completed) {
            requiredWins = 2;
        } else {
            requiredWins = (gameState.stackedPoints >= 3) ? 2 : 3;
        }

        if (gameState.consecutiveWins >= requiredWins) {
            const claimedPoints = gameState.stackedPoints;
            if (winningTeam === 1) {
                gameState.team1Points += claimedPoints;
            } else {
                gameState.team2Points += claimedPoints;
            }

            const wasRound1 = gameState.currentStake === 1 && !gameState.stake1Completed;
            const message = wasRound1
                ? `Team ${displayTeam} (${winnerName}) holds the lead and sweeps ${claimedPoints} stacked points! Table cleared — Round 2 starts (2 consecutive hands wins).`
                : `Team ${displayTeam} (${winnerName}) wins 2 consecutive hands and sweeps ${claimedPoints} stacked points! Table cleared.`;
            setStatusMessage(message);

            // Clear the played cards from the table and reset stack for the next round
            resetTable();

            // Move to Round 2 (Stake 2) if we were in Round 1
            if (gameState.currentStake === 1) {
                gameState.currentStake = 2;
                gameState.stake1Completed = true;
            }

            updateUI();
            return { message, wasConsecutive: true };
        } else {
            const message = `${winnerName} (Team ${displayTeam}) wins 2nd consecutive hand (${gameState.consecutiveWins}/${requiredWins})! Win 3rd hand to sweep ${gameState.stackedPoints + 1} pts · Stack: ${gameState.stackedPoints}`;
            setStatusMessage(message);
            updateUI();
            return { message, wasConsecutive: true };
        }
    } else {
        // Opponent cuts/overtakes the lead — cards and points KEEP STACKING on the table!
        gameState.currentChallengeTeam = winningTeam;
        gameState.consecutiveWins = 1;
        gameState.leadHolderPlayerId = winningPlayerId;

        gameState.team1Consecutive = (winningTeam === 1) ? 1 : 0;
        gameState.team2Consecutive = (winningTeam === 2) ? 1 : 0;
        gameState.initialLeadTeam = null;

        const message = `Team ${displayTeam} (${winnerName}) cuts the lead! Cards & points keep stacking (Stack: ${gameState.stackedPoints}) — win next hand to sweep ${gameState.stackedPoints + 1} pts!`;
        setStatusMessage(message);
        updateUI();
        return { message, wasConsecutive: false };
    }
}

function resetTable() {
    // Reset challenge state
    gameState.stackedPoints = 0;
    gameState.consecutiveWins = 0;
    gameState.team1Consecutive = 0;
    gameState.team2Consecutive = 0;
    gameState.currentChallengeTeam = null;
    gameState.leadHolderPlayerId = null;
    
    // Clear table state
    gameState.tableCards = [];
    gameState.handIndex = 0;
    gameState.lastPlayedPlayerId = null;
    // Clear any trick state to avoid residuals
    gameState.trickCards = [];
    gameState.ledSuit = null;
    
    // reset visual z-order counters so new round starts fresh
    gameState.playSeqCounter = 0;
    gameState.playCountByPlayer = {1:0,2:0,3:0,4:0};
    
    // Remove visual cards from table
    $('.trick-area .played-card').remove();
    
    // Immediately refresh UI so table count and scores reflect the reset
    updateUI();
}

function addHandWinner(playerName, team, wasConsecutiveOverride) {
    const displayTeam = getDisplayTeamNumber(team);
    const isConsecutive = typeof wasConsecutiveOverride === 'boolean'
        ? wasConsecutiveOverride
        : ((team === 1 && gameState.team1Consecutive > 1) ||
           (team === 2 && gameState.team2Consecutive > 1));
    
    const winnerElement = $('<div class="hand-winner"></div>');
    winnerElement.addClass(`team${displayTeam}`);
    if (isConsecutive) {
        winnerElement.addClass('consecutive');
    }
    
    winnerElement.html(`
        <strong>Hand ${gameState.totalHandsPlayed}:</strong> ${playerName} (Team ${displayTeam})
        ${isConsecutive ? '<i class="fas fa-fire text-warning ms-1"></i>' : ''}
    `);
    
    $('#hand-winners-list').prepend(winnerElement);
    
    // Limit to 10 most recent winners
    if ($('#hand-winners-list .hand-winner').length > 10) {
        $('#hand-winners-list .hand-winner').last().remove();
    }
}

function endGame() {
    gameState.gameState = "GAME_END";
    clearTimeout(onlineState.turnTimer);
    onlineState.turnTimer = null;
    onlineState.turnTimerKey = null;
    clearTimeout(gameState.reactionTimer);
    clearTimeout(gameState.announcementTimer);
    gameState.reactionTimer = null;
    
    // Check if there are any remaining stacked points to award
    if (gameState.stackedPoints > 0 && gameState.currentChallengeTeam) {
        if (gameState.currentChallengeTeam === 1) {
            gameState.team1Points += gameState.stackedPoints;
        } else {
            gameState.team2Points += gameState.stackedPoints;
        }
        setStatusMessage(`Team ${getDisplayTeamNumber(gameState.currentChallengeTeam)} claims ${gameState.stackedPoints} stacked points at game end!`);
        gameState.stackedPoints = 0;
    }
    
    // Verify total points equal 13
    const totalPoints = gameState.team1Points + gameState.team2Points;
    if (totalPoints !== 13) {
        console.error(`Scoring error: Total points is ${totalPoints}, should be 13`);
        // Fix the discrepancy by awarding remaining points to the team with more points
        const pointsDifference = 13 - totalPoints;
        if (gameState.team1Points > gameState.team2Points) {
            gameState.team1Points += pointsDifference;
        } else if (gameState.team2Points > gameState.team1Points) {
            gameState.team2Points += pointsDifference;
        } else {
            // If tie, split the remaining points
            gameState.team1Points += Math.floor(pointsDifference / 2);
            gameState.team2Points += Math.ceil(pointsDifference / 2);
        }
    }
    
    // Determine winner based on points
    let winnerMessage, steakMessage;
    let celebrationTitle = 'ROUND CLEAR!';
    let isSweep = false;
    if (gameState.team1Points > gameState.team2Points) {
        const localTeamWon = gameState.players[getLocalPerspectiveSeatIndex()].team === 1;
        winnerMessage = `Team ${localTeamWon ? 1 : 2} Wins!`;
        steakMessage = localTeamWon
            ? `Final Score: ${gameState.team1Points} - ${gameState.team2Points}`
            : `Final Score: ${gameState.team2Points} - ${gameState.team1Points}`;
        gameState.lastWinningTeam = 1;
    } else if (gameState.team2Points > gameState.team1Points) {
        const localTeamWon = gameState.players[getLocalPerspectiveSeatIndex()].team === 2;
        winnerMessage = `Team ${localTeamWon ? 1 : 2} Wins!`;
        steakMessage = localTeamWon
            ? `Final Score: ${gameState.team2Points} - ${gameState.team1Points}`
            : `Final Score: ${gameState.team1Points} - ${gameState.team2Points}`;
        gameState.lastWinningTeam = 2;
    } else {
        // Tie condition
        winnerMessage = "It's a Tie!";
        steakMessage = `Both teams scored ${gameState.team1Points} points`;
        gameState.lastWinningTeam = null;
    }

    if (gameState.lastWinningTeam && Math.max(gameState.team1Points, gameState.team2Points) === 13) {
        isSweep = true;
        const trumpChooser = gameState.players.find(player => player.id === gameState.trumpChooserId);
        const chooserWasSwept = trumpChooser && trumpChooser.team !== gameState.lastWinningTeam;
        celebrationTitle = chooserWasSwept ? 'GOOHN COURT!!' : 'COURT!!';
        const losingTeam = gameState.lastWinningTeam === 1 ? 2 : 1;
        const displayedLosingTeam = getDisplayTeamNumber(losingTeam);
        steakMessage += chooserWasSwept
            ? ` · Team ${displayedLosingTeam} was shut out — 😂 LOL`
            : ` · Team ${displayedLosingTeam} got swept — 😂 LOL`;
    }

    const partners = { 1: 3, 2: 4, 3: 1, 4: 2 };
    if (gameState.lastWinningTeam) {
        const previousChooser = gameState.players.find(player => player.id === gameState.trumpChooserId);
        const finalHandWinner = gameState.lastHandWinnerId;
        const winnerOnLastHand = finalHandWinner &&
            gameState.players.find(player => player.id === finalHandWinner)?.team === gameState.lastWinningTeam;
        // Lead player on the winning team: if the winning team already held trump, keep that lead player;
        // otherwise, the winning team takes over trump decision (via their final-hand winner or primary seat).
        const winningTeamLeadId = (previousChooser && previousChooser.team === gameState.lastWinningTeam)
            ? previousChooser.id
            : (winnerOnLastHand ? finalHandWinner : (gameState.lastWinningTeam === 1 ? 1 : 2));

        if (isSweep) {
            // 13-point Court: trump suit selection shifts to the partner on the winning team!
            gameState.nextTrumpChooserId = partners[winningTeamLeadId];
        } else {
            // Normal win (< 13 points): the winning team decides the trump suit next game!
            gameState.nextTrumpChooserId = winningTeamLeadId;
        }
    } else {
        gameState.nextTrumpChooserId = gameState.trumpChooserId || 1;
    }

    recordOnlineGame(isSweep, celebrationTitle);
    onlineState.endGameResult = { isSweep, celebrationTitle };
    
    // Build bold loser taunt message
    let loserTauntText = '';
    if (gameState.lastWinningTeam) {
        const losingTeamNum = gameState.lastWinningTeam === 1 ? 2 : 1;
        const displayedLosingTeam = getDisplayTeamNumber(losingTeamNum);
        const losingPlayers = gameState.players
            .filter(p => p.team === losingTeamNum)
            .map(p => p.name)
            .join(' & ');
        const losingScore = Math.min(gameState.team1Points, gameState.team2Points);
        if (isSweep) {
            loserTauntText = celebrationTitle === 'GOOHN COURT!!'
                ? `👑😂 SAVAGE ROAST: Team ${displayedLosingTeam} (${losingPlayers}) called Trump and still scored 0/13 — GOOHN COURT! Pack your bags! 🃏🔥`
                : `🏆😂 COURT SWEEP TAUNT: Team ${displayedLosingTeam} (${losingPlayers}) got completely swept 13 - 0! Did you forget how to play Rung?! 💃🕺`;
        } else {
            loserTauntText = `😜 TAUNT: Team ${displayedLosingTeam} (${losingPlayers}) only managed ${losingScore} pts — outplayed under the VIP club lights! Better luck next deal! ✨`;
        }
    } else {
        loserTauntText = `🤝 Deadlock at the VIP Table! Next hand settles who rules the club!`;
    }

    // Show celebration
    rulesAreOpen = false;
    $('#celebration').removeClass('celebration--rules').addClass('celebration--flashing');
    $('#celebration-title')
        .text(celebrationTitle)
        .addClass('rainbow-glow-font')
        .toggleClass('celebration-title--court', isSweep);
    $('#celebration-dancer-wrap, #trophy').show();
    $('#loser-taunt-banner').text(loserTauntText).show();
    $('#play-again-btn').html('🃏 Play Again');
    $('#end-game-btn').prop('hidden', false).prop('disabled', false).html('🚪 End Game');
    $('#rules-content').hide().empty();
    $('#win-message').text(winnerMessage).addClass('rainbow-glow-font');
    const nextChooser = gameState.players.find(player => player.id === gameState.nextTrumpChooserId);
    const steakText = gameState.lastWinningTeam
        ? `${steakMessage} · ${nextChooser.name} chooses trump next game`
        : steakMessage;
    $('#steak-display').text(steakText).data('base-text', steakText);
    $('#win-message, #steak-display').show();
    $('#celebration').css('display', 'flex');
    
    // Clear the table for the next game
    gameState.tableCards = [];
    gameState.handIndex = 0;
    $('.trick-area .played-card').remove();
    
    // Update UI
    updateUI();
}

async function recordOnlineGame(isSweep, celebrationTitle) {
    if ((!onlineState.isHost && !onlineState.isReplica) || onlineState.isViewer ||
        !onlineState.gameId || !window.rungFirebase) return true;
    const user = window.rungFirebase.user;
    const localSeat = gameState.players.find(player => player.uid === user.uid);
    if (!localSeat) return true;
    const recordKey = `rung-recorded-${onlineState.gameId}`;
    if (localStorage.getItem(recordKey) === 'complete') {
        try {
            const stats = await window.rungFirebase.getMyLeaderboardEntry();
            updateSteakWinRate(stats);
        } catch (error) {
            console.error('Loading your Hall of Fame record failed:', error);
        }
        return true;
    }
    if (onlineState.recordingGameId === onlineState.gameId) {
        return onlineState.recordingPromise;
    }
    onlineState.recordingGameId = onlineState.gameId;
    const won = localSeat.team === gameState.lastWinningTeam;
    const partner = gameState.players.find(player =>
        player.team === localSeat.team && player.id !== localSeat.id);
    const awards = [];
    if (won) awards.push('wins');
    if (won && isSweep) awards.push('court');
    if (won && celebrationTitle === 'GOOHN COURT!!') awards.push('goohn');
    onlineState.recordingPromise = (async () => {
        try {
            const stats = await window.rungFirebase.updateLeaderboard(
                localSeat.name,
                partner?.name || '',
                won && isSweep ? 1 : 0,
                awards,
                gameState.lastWinningTeam === null ? null : won
            );
            updateSteakWinRate(stats);
            localStorage.setItem(recordKey, 'complete');
            await refreshHallOfFame();
            return true;
        } catch (error) {
            onlineState.recordingGameId = null;
            console.error('Updating the Hall of Fame failed:', error);
            setStatusMessage('Game finished, but your Hall of Fame result could not be saved.');
            return false;
        } finally {
            onlineState.recordingPromise = null;
        }
    })();
    return onlineState.recordingPromise;
}

function updateSteakWinRate(stats) {
    const wins = Number(stats?.wins || 0);
    const losses = Number(stats?.losses || 0);
    const trackedDecisions = wins + losses;
    const winRate = trackedDecisions ? `${Math.round((wins / trackedDecisions) * 100)}%` : '—';
    const baseText = $('#steak-display').data('base-text');
    if (baseText) {
        $('#steak-display').text(`${baseText} · Record ${wins}-${losses} · Win rate ${winRate}`);
    }
}

async function endMatchToLobby() {
    if (rulesAreOpen || gameState.gameState !== 'GAME_END') return;
    const button = $('#end-game-btn');
    button.prop('disabled', true).text('Syncing score…');
    try {
        const result = onlineState.endGameResult || { isSweep: false, celebrationTitle: 'ROUND CLEAR!' };
        const scoreSaved = await recordOnlineGame(result.isSweep, result.celebrationTitle);
        if (!scoreSaved) {
            throw new Error('Your score could not be synced. Check your connection and try again.');
        }
        if (onlineState.isHost) {
            await publishOnlineState(true);
            await onlineState.actionQueue;
        }
        if (onlineState.voiceStream) await toggleVoice();
        clearRoomSubscriptions();
        onlineState.mode = null;
        onlineState.roomId = null;
        onlineState.room = null;
        onlineState.seatIndex = null;
        onlineState.isHost = false;
        onlineState.isViewer = false;
        onlineState.isReplica = false;
        onlineState.hasStarted = false;
        onlineState.endGameResult = null;
        $('#celebration').hide();
        $('#end-game-btn').prop('disabled', false).text('End Game').prop('hidden', true);
        returnToLobby();
    } catch (error) {
        console.error('Ending the match failed:', error);
        setStatusMessage(error.message || 'The score could not be synced. Please retry.');
        button.prop('disabled', false).text('Retry score sync');
    }
}

function showRules() {
    const rulesHtml = `
        <div class="rules-copy">
            <p>RUNG (Court Piece) is a 4-player trick-taking card game played in teams of two. The deck has 52 cards.</p>
            <h6>Stakes</h6>
            <ul>
                <li><strong>Stake 1</strong>: 3 consecutive wins (1+1+1 points)</li>
                <li><strong>Stake 2</strong>: 2 consecutive wins (2 points)</li>
            </ul>
            <h6>Gameplay</h6>
            <ul>
                <li>Players play one card per hand in anti-clockwise order.</li>
                <li>Play numbers restart at 1 for each hand and run through 4.</li>
                <li>Follow suit if you can.</li>
                <li>Cards accumulate in the stack; consecutive wins claim the stack.</li>
                <li>Trump suit beats led suit; within suit higher rank wins (A high).</li>
                <li>Each seated player sees their own hand at the bottom and their partner across the table. The trump chooser stays the same between games until a team wins Court.</li>
            </ul>
            <h6>Goal</h6>
            <p>Collect the stacked points by achieving required consecutive wins as per the current stake.</p>
            <h6>After the game</h6>
            <ul>
                <li>Choose <strong>Play Again</strong> to start another game at the table, or <strong>End Game</strong> to sync your result and return to the lobby.</li>
                <li>The Hall of Fame shows the partner you played with most recently, helping players find ranked teammates. Computer-controlled players use varied names marked <strong>(Bot)</strong>.</li>
            </ul>
            <h6>Rejoining or watching a running table</h6>
            <ul>
                <li>Use <strong>Your running tables → Resume</strong> to return to a game you already joined. Your stable Player ID is informational; the table ID or private invite code identifies the table.</li>
                <li>New players request a seat; the host has up to <strong>60 seconds</strong> to approve or decline. If there is no response, the request expires and you can retry or watch a public table.</li>
                <li>Player requests appear in a live host alert and in <strong>Manage table</strong>. The first approved player replaces Player 3 and partners the host; later players take the next available bot seat. Public viewer requests are accepted automatically and do not take a seat.</li>
                <li>Each turn has a <strong>15-second</strong> timer. The highest legal card is played automatically after a timeout; the first two missed turns do not replace the player. After <strong>3 consecutive missed turns</strong>, that player is replaced by a bot and returned to the lobby.</li>
                <li>The host’s browser runs the game and turn timers. If the host refreshes or returns on the same browser identity, the saved private game state restores host control. If recovery data is unavailable, the host can still watch the last synchronized state.</li>
            </ul>
            <h6>Table voice</h6>
            <ul>
                <li>Players can choose <strong>Join voice</strong> to share microphone audio with the other seated players. Allow microphone access when the browser asks; the connection uses WebRTC and may need a TURN relay on restrictive networks.</li>
            </ul>
        </div>
    `;
    rulesAreOpen = true;
    $('#celebration').addClass('celebration--rules').removeClass('celebration--flashing');
    $('#celebration-title').text('HOW TO PLAY').removeClass('celebration-title--court');
    $('#celebration-dancer-wrap, #trophy, #win-message, #loser-taunt-banner, #steak-display').hide();
    $('#rules-content').html(rulesHtml).show();
    $('#play-again-btn').text('Close');
    $('#end-game-btn').prop('hidden', true);
    $('#celebration').css('display', 'flex');
}

function closeRules() {
    rulesAreOpen = false;
    $('#celebration').removeClass('celebration--rules');
    const result = onlineState.endGameResult;
    const isGameEnd = gameState.gameState === 'GAME_END';
    const title = isGameEnd && result?.celebrationTitle ? result.celebrationTitle : 'ROUND CLEAR!';
    $('#celebration-title')
        .text(title)
        .toggleClass('celebration-title--court', Boolean(isGameEnd && result?.isSweep));
    $('#celebration-dancer-wrap, #trophy, #win-message, #loser-taunt-banner, #steak-display').show();
    $('#rules-content').hide().empty();
    $('#play-again-btn').html('🃏 Play Again');
    $('#end-game-btn').prop('hidden', !isGameEnd);
    if (isGameEnd) {
        $('#celebration').addClass('celebration--flashing').css('display', 'flex');
    } else {
        $('#celebration').hide();
    }
}

// New: safe wrapper that invokes a real aiSelectTrump if available, otherwise uses a fallback
function safeAiSelectTrump() {
    try {
        // Prefer a real implementation if available
        const real = (typeof aiSelectTrump === 'function') ? aiSelectTrump
                    : (typeof window !== 'undefined' && typeof window.aiSelectTrump === 'function') ? window.aiSelectTrump
                    : null;
        if (real && real !== safeAiSelectTrump) {
            return real();
        }

        // Fallback: choose the suit with the most cards for current AI player
        const idx = gameState.currentPlayer;
        const aiPlayer = gameState.players[idx];
        if (!aiPlayer) {
            console.warn('safeAiSelectTrump: no current AI player');
            return;
        }
        const suitCounts = { hearts:0, diamonds:0, clubs:0, spades:0 };
        (aiPlayer.cards || []).forEach(c => { if (c && c.suit) suitCounts[c.suit] = (suitCounts[c.suit]||0) + 1; });

        let chosenSuit = 'hearts';
        let max = -1;
        for (const s of ['hearts','diamonds','clubs','spades']) {
            if ((suitCounts[s]||0) > max) { max = suitCounts[s]; chosenSuit = s; }
        }

        gameState.trumpSuit = chosenSuit;
        gameState.gameState = "PLAYING";
        gameState.currentPlayer = gameState.players.findIndex(player => player.id === gameState.trumpChooserId);
        if (gameState.currentPlayer < 0) {
            throw new Error(`Trump chooser ${gameState.trumpChooserId} is not a valid player`);
        }
        setStatusMessage(`${aiPlayer.name} chose ${SUIT_SYMBOLS[chosenSuit]} - they lead first`);
        updateUI();
        startTurn();
    } catch (err) {
        console.error('safeAiSelectTrump error', err);
    }
}

// New: safe aiPlayTurn wrapper - uses real aiPlayTurn if available, else uses aiPlayCard+playCard fallback
function safeAiPlayTurn() {
    try {
        const real = (typeof aiPlayTurn === 'function') ? aiPlayTurn
                    : (typeof window !== 'undefined' && typeof window.aiPlayTurn === 'function') ? window.aiPlayTurn
                    : null;
        if (real && real !== safeAiPlayTurn) {
            return real();
        }

        // Fallback: if current player is AI, pick a card via aiPlayCard (if available) or simple random
        if (gameState.gameState !== "PLAYING" || gameState.trickCards.length >= 4) return;
        const current = gameState.players[gameState.currentPlayer];
        if (!current || current.isHuman) return;

        // fallback aiPlayCard if real implementation missing
        let card = null;
        const realAiPlayCard = (typeof aiPlayCard === 'function') ? aiPlayCard
                              : (typeof window !== 'undefined' && typeof window.aiPlayCard === 'function') ? window.aiPlayCard
                              : null;
        if (realAiPlayCard) {
            card = realAiPlayCard(current);
        } else {
            // naive fallback: random card
            if (current.cards && current.cards.length) {
                card = current.cards[Math.floor(Math.random() * current.cards.length)];
            }
        }

        if (card) {
            playCard(card, current);
        } else {
            console.warn('safeAiPlayTurn: no card selected for AI');
        }
    } catch (err) {
        console.error('safeAiPlayTurn error', err);
    }
}

// Expose safe functions to window if real ones don't exist (do not overwrite real implementations)
if (typeof window !== 'undefined') {
    if (typeof window.aiSelectTrump !== 'function') {
        window.aiSelectTrump = safeAiSelectTrump;
    }
    if (typeof window.aiPlayTurn !== 'function') {
        window.aiPlayTurn = safeAiPlayTurn;
    }
    // ensure aiPlayCard has a tactical Court Piece implementation so bots play intelligently
    if (typeof window.aiPlayCard !== 'function' && typeof aiPlayCard !== 'function') {
        window.aiPlayCard = function(player) {
            if (!player || !player.cards || !player.cards.length) return null;
            const byRankAsc = (a, b) => RANK_VALUES[a.rank] - RANK_VALUES[b.rank];
            const byRankDesc = (a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank];
            const trumpSuit = gameState.trumpSuit;
            const ledSuit = gameState.ledSuit;

            // Helper to find who currently holds the winning card in trickCards
            const getCurrentTrickWinner = () => {
                if (!gameState.trickCards || !gameState.trickCards.length) return null;
                let best = gameState.trickCards[0];
                for (let i = 1; i < gameState.trickCards.length; i++) {
                    const entry = gameState.trickCards[i];
                    const c = entry.card;
                    const w = best.card;
                    if (w.suit !== trumpSuit && c.suit === trumpSuit) {
                        best = entry;
                    } else if (c.suit === w.suit && RANK_VALUES[c.rank] > RANK_VALUES[w.rank]) {
                        best = entry;
                    }
                }
                const winnerPlayer = gameState.players.find(p => p.id === best.player);
                return { card: best.card, player: winnerPlayer, team: winnerPlayer?.team };
            };

            // 1. Leading the trick
            if (!ledSuit) {
                const nonTrumps = player.cards.filter(c => c.suit !== trumpSuit);
                const topNonTrumps = nonTrumps.filter(c => c.rank === 'A' || c.rank === 'K').sort(byRankDesc);
                if (topNonTrumps.length) return topNonTrumps[0];
                const pool = nonTrumps.length ? nonTrumps : player.cards;
                const counts = {};
                pool.forEach(c => { counts[c.suit] = (counts[c.suit] || 0) + 1; });
                const sorted = [...pool].sort((a, b) =>
                    (counts[b.suit] - counts[a.suit]) || (RANK_VALUES[b.rank] - RANK_VALUES[a.rank])
                );
                return sorted[0];
            }

            const currentBest = getCurrentTrickWinner();
            const partnerWinning = currentBest && currentBest.team === player.team;
            const partnerIsLeadHolder = partnerWinning && currentBest.player && currentBest.player.id === gameState.leadHolderPlayerId;
            const isFourthToPlay = gameState.trickCards.length === 3;
            const partnerHasStrongWinner = partnerWinning && (
                partnerIsLeadHolder ||
                isFourthToPlay ||
                currentBest.card.suit === trumpSuit ||
                RANK_VALUES[currentBest.card.rank] >= RANK_VALUES['K']
            );

            // 2. Following suit
            const sameSuit = player.cards.filter(c => c.suit === ledSuit).sort(byRankAsc);
            if (sameSuit.length) {
                if (partnerHasStrongWinner) {
                    return sameSuit[0]; // play lowest card when partner already has the trick covered
                }
                // Can we beat the current winning card? (Only possible if current winner is ledSuit)
                if (currentBest && currentBest.card.suit === ledSuit) {
                    const winners = sameSuit.filter(c => RANK_VALUES[c.rank] > RANK_VALUES[currentBest.card.rank]);
                    if (winners.length) {
                        return isFourthToPlay ? winners[0] : winners[winners.length - 1];
                    }
                }
                return sameSuit[0];
            }

            // 3. Void in led suit
            const nonTrumps = player.cards.filter(c => c.suit !== trumpSuit).sort(byRankAsc);
            const trumps = player.cards.filter(c => c.suit === trumpSuit).sort(byRankAsc);

            if (!partnerHasStrongWinner && trumps.length) {
                if (currentBest && currentBest.card.suit === trumpSuit) {
                    const overTrumps = trumps.filter(c => RANK_VALUES[c.rank] > RANK_VALUES[currentBest.card.rank]);
                    if (overTrumps.length) return overTrumps[0];
                } else {
                    return trumps[0]; // cut with lowest trump
                }
            }

            // Slough lowest non-trump card (or lowest trump if holding only trumps)
            return nonTrumps.length ? nonTrumps[0] : player.cards.slice().sort(byRankAsc)[0];
        };
    }
}

// New: begin the current player's turn (shows status and triggers AI if needed)
function startTurn(previousHandNotice = '') {
    try {
        // default to human (index 0) if currentPlayer is invalid
        if (typeof gameState.currentPlayer !== 'number' || gameState.currentPlayer < 0 || gameState.currentPlayer > 3) {
            gameState.currentPlayer = 0;
        }

        updateUI();
        const current = gameState.players[gameState.currentPlayer];
        if (!current) return;

        const prefix = previousHandNotice ? `${previousHandNotice} · ` : '';
        if (current.isHuman) {
            const isLocalHostTurn = onlineState.isHost && current.uid === window.rungFirebase?.user.uid;
            const turnPrompt = isLocalHostTurn || !onlineState.isHost
                ? 'Your turn - play a card'
                : `Waiting for ${current.name} to play…`;
            setStatusMessage(`${prefix}${turnPrompt}`);
            startOnlineTurnTimer();
        } else {
            setStatusMessage(`${prefix}${current.name} is playing...`);
            // Use safe exposed AI play function
            const aiFn = (typeof window !== 'undefined' && typeof window.aiPlayTurn === 'function') ? window.aiPlayTurn
                        : (typeof aiPlayTurn === 'function' ? aiPlayTurn : null);
            if (aiFn) {
                setTimeout(aiFn, 550);
            } else {
                console.warn('startTurn: no aiPlayTurn available');
            }
        }
    } catch (err) {
        console.error('startTurn error', err);
    }
}