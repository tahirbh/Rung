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
    consecutiveWins: 0,
    totalHandsPlayed: 0,
    lastWinningTeam: null,
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
const AI_REACTIONS = ['😎', '😅', '🤔', '🔥', '👏', '😮', '😂', '❤️', 'Unlucky!'];

// Early-safe helper so initializeGame can call it without ReferenceError
function setStatusMessage(message) {
    if (typeof $ !== 'undefined' && $('#status-message').length) {
        $('#status-message').text(message);
    } else if (typeof console !== 'undefined') {
        // fallback for early calls before DOM ready
        console.log('status:', message);
    }
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
	// call initializeGame safely to avoid unhandled promise rejections
	(async () => {
		try {
			await initializeGame();
		} catch (err) {
			console.error('initializeGame (startup) failed:', err);
			setStatusMessage('Initialization error - check console');
		}
	})();

    $('#new-game-btn').click(function() {
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

// Make initializeGame async so we can await the animated deal
async function initializeGame() {
	try {
		// Reset game state
		gameState.deck = [];
		gameState.players.forEach(player => {
			player.cards = [];
			player.tricks = 0;
		});
		gameState.currentPlayer = 1;
		gameState.trumpSuit = null;
		gameState.ledSuit = null;
		gameState.trickCards = [];
		gameState.trickWinner = null;
		gameState.handsPlayed = 0;
		gameState.gameState = "TRUMP_SELECTION";
		gameState.team1Points = 0;
		gameState.team2Points = 0;
		gameState.team1Consecutive = 0;
		gameState.team2Consecutive = 0;
		gameState.tableCards = [];
		gameState.handIndex = 0;
		gameState.handWinners = [];
		gameState.stackedPoints = 0;
		gameState.currentStake = 1;
		gameState.consecutiveWins = 0;
		gameState.totalHandsPlayed = 0;
		gameState.lastWinningTeam = null;
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
		gameState.stake1Completed = false;

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
        updateUI();
        await sleep(200);
    }

    // Prompt human to select trump (human must select)
    gameState.gameState = "TRUMP_SELECTION";
    setStatusMessage('Please select trump suit (choose from the popup)');
    // Wait for selection
    const chosenSuit = await waitForTrumpSelection();
    // apply selection via selectTrump helper (keeps UI consistent)
    selectTrump(chosenSuit);

    // Phase 2: deal remaining cards (cards 21..52)
    for (let i = 20; i < gameState.deck.length; i++) {
        const playerIndex = i % 4;
        const card = gameState.deck[i];
        gameState.players[playerIndex].cards.push(card);
        updateUI();
        await sleep(200);
    }

    // finished dealing
    setStatusMessage('Dealing complete.');

    // Start the first hand: human leads (player index 0) per rules
    gameState.currentPlayer = 0;
    startTurn();
    scheduleRandomPlayerReaction();
}

// Wait for human to select trump via overlay. Resolves with selected suit string.
function waitForTrumpSelection() {
	return new Promise((resolve) => {
		// show overlay
		$('#trump-selection').show();
		// ensure previous handlers not duplicated
		$('#trump-selection .trump-btn').off('click.trumpSelect').on('click.trumpSelect', function() {
			const suit = $(this).attr('data-suit');
			resolve(suit);
		});
	});
}

// Called when trump chosen (either via waitForTrumpSelection resolver or other)
function selectTrump(suit) {
	// set game-wide trump and hide overlay
	gameState.trumpSuit = suit;
	// keep gameState as PLAYING once trump is set
	gameState.gameState = "PLAYING";
	$('#trump-selection').hide();
	setStatusMessage(`Trump selected: ${SUIT_SYMBOLS[suit]}. Dealing remaining cards...`);
	updateUI();
	// Do not start turn here; dealCards will call startTurn() after finishing the full deal
}

// Also ensure overlay click handler (defensive) is bound on DOM ready
$(document).ready(function() {
    // Attach explicit select handler so other code can call selectTrump too if needed
    $('#trump-selection .trump-btn').off('click.trumpSelectGlobal').on('click.trumpSelectGlobal', function() {
        const suit = $(this).attr('data-suit');
        // if a promise is waiting via waitForTrumpSelection, that promise will resolve too; call selectTrump to be safe
        selectTrump(suit);
    });
});

// Update UI
function updateUI() {
    // Update player cards with fan layout
    for (let i = 0; i < 4; i++) {
        const player = gameState.players[i];
        const cardArea = $(`#player${i+1}-cards`);
        cardArea.empty();
        const playerArea = cardArea.closest('.player-area');
        playerArea.toggleClass('is-current-turn', gameState.gameState === "PLAYING" && i === gameState.currentPlayer);
        playerArea.toggleClass('last-played-player', player.id === gameState.lastPlayedPlayerId);
        
        if (player.isHuman || gameState.gameState === "GAME_END") {
            // Show actual cards for human player or at game end
            positionCardsInFan(player.cards, i, cardArea);
        } else {
            // Show card backs for AI players
            positionCardBacksInFan(player.cards.length, i, cardArea);
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
    
    // Update table cards count
    $('#table-cards-count').text(`Cards on table: ${gameState.tableCards.length}`);
    
    // Update scores
    $('#team1-points').text(gameState.team1Points);
    $('#team2-points').text(gameState.team2Points);
    $('#team1-consecutive').text(gameState.team1Consecutive);
    $('#team2-consecutive').text(gameState.team2Consecutive);
    
    // Update stacked points
    $('#stacked-points').text(gameState.stackedPoints);
    
    // Update hands played
    $('#hands-played').text(`Hands played: ${gameState.totalHandsPlayed}`);
    
    // Update current player
    const currentPlayerName = gameState.players[gameState.currentPlayer].name;
    $('#current-player').text(`Current: ${currentPlayerName}`);
    
    // Update cards remaining
    const humanCards = gameState.players[0].cards.length;
    $('#cards-remaining').text(`Cards in hand: ${humanCards}`);
    
    // Update stake display
    $('#stake-display').text(gameState.currentStake);
    $('#current-stake').text(`Stake ${gameState.currentStake} (${gameState.currentStake === 1 ? '3 consecutive wins' : '2 consecutive wins'})`);
    
    // Ensure game-table and trick area use relative positioning for correct absolute placement
    $('.game-table').css('position', 'relative');
    $('.trick-area').css('position', 'relative');

    // Initialize/clean history panels (safe)
    ensurePlayerHistoryUI();
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
	const panel = $(`#player${playerId}-history`);
	if (!panel.length) return;

	panel.empty();

	const arr = gameState.lastPlayedByPlayer[playerId] || [];
	if (!arr.length) {
		panel.append($('<div class="history-empty">—</div>'));
		return;
	}

	const card = arr[arr.length - 1];
	const suitSymbol = SUIT_SYMBOLS[card.suit] || '';
	const colorClass = (card.suit === 'hearts' || card.suit === 'diamonds') ? 'suit-red' : 'suit-black';
	const lastPlay = gameState.lastPlayInfoByPlayer[playerId];
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

function broadcastReaction(message) {
	const reaction = String(message || '').trim();
	if (!reaction) return;

	showPlayerReaction(1, reaction);
	const announcement = $('#table-announcement');
	announcement.text(`You: ${reaction}`).addClass('is-visible');
	clearTimeout(gameState.announcementTimer);
	gameState.announcementTimer = setTimeout(() => announcement.removeClass('is-visible'), 3000);
	closeReactionPicker();
}

function showPlayerReaction(playerId, reaction) {
	const player = gameState.players.find(item => item.id === playerId);
	const playerArea = $(`#player${playerId}-cards`).closest('.player-area');
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
    const maxFanAngle = 75;
    const fanAngle = Math.min(maxFanAngle, cardCount * 5);
    const startAngle = -fanAngle / 2;
    const angleStep = fanAngle / (cardCount - 1 || 1);
    const centerIndex = (cardCount - 1) / 2;
    
    cards.forEach((card, index) => {
        const cardElement = createCardElement(card, playerIndex === 0);
        
        switch(playerIndex) {
            case 0: // Bottom player - horizontal fan
                const rotBottom = startAngle + (index * angleStep);
                const translateXBottom = (index - centerIndex) * 15;
                cardElement.css({
                    transform: `rotate(${rotBottom}deg) translateX(${translateXBottom}px)`,
                    zIndex: index
                });
                break;
                
            case 1: // Left player - vertical fan facing center
                const rotLeft = 90 - startAngle - (index * angleStep);
                const translateXLeft = (centerIndex - index) * 12;
                cardElement.css({
                    transform: `rotate(${rotLeft}deg) translateX(${translateXLeft}px)`,
                    zIndex: index
                });
                break;
                
            case 2: // Top player - horizontal fan (rotated 180°)
                const rotTop = 180 + startAngle + (index * angleStep);
                const translateXTop = (index - centerIndex) * 15;
                cardElement.css({
                    transform: `rotate(${rotTop}deg) translateX(${translateXTop}px)`,
                    zIndex: index
                });
                break;
                
            case 3: // Right player - vertical fan facing center
                const rotRight = 270 + startAngle + (index * angleStep);
                const translateXRight = (index - centerIndex) * 12;
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
    const maxFanAngle = 75;
    const fanAngle = Math.min(maxFanAngle, cardCount * 5);
    const startAngle = -fanAngle / 2;
    const angleStep = fanAngle / (cardCount - 1 || 1);
    const centerIndex = (cardCount - 1) / 2;
    
    for (let i = 0; i < cardCount; i++) {
        const cardElement = $('<div class="card card-back"></div>');
        
        switch(playerIndex) {
            case 0: // Bottom player
                const rotationBottom = startAngle + (i * angleStep);
                const translateXBottom = (i - centerIndex) * 15;
                cardElement.css({
                    transform: `rotate(${rotationBottom}deg) translateX(${translateXBottom}px)`,
                    zIndex: i
                });
                break;
                
            case 1: // Left player
                const rotationLeft = 90 - startAngle - (i * angleStep);
                const translateXLeft = (centerIndex - i) * 12;
                cardElement.css({
                    transform: `rotate(${rotationLeft}deg) translateX(${translateXLeft}px)`,
                    zIndex: i
                });
                break;
                
            case 2: // Top player
                const rotationTop = 180 + startAngle + (i * angleStep);
                const translateXTop = (i - centerIndex) * 15;
                cardElement.css({
                    transform: `rotate(${rotationTop}deg) translateX(${translateXTop}px)`,
                    zIndex: i
                });
                break;
                
            case 3: // Right player
                const rotationRight = 270 + startAngle + (i * angleStep);
                const translateXRight = (i - centerIndex) * 12;
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
    const currentPlayer = gameState.players[gameState.currentPlayer];
    
    if (gameState.gameState === "TRUMP_SELECTION" && currentPlayer.isHuman) {
        // Human selecting trump
        gameState.trumpSuit = card.suit;
        gameState.gameState = "PLAYING";
        gameState.currentPlayer = 0; // Human player goes first
        setStatusMessage("Your turn - play a card");
        updateUI();
    } else if (gameState.gameState === "PLAYING" && currentPlayer.isHuman) {
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
            player: playerObj.id
        });

        // Set led suit if this is the first card of the trick
        if (gameState.trickCards.length === 1) {
            gameState.ledSuit = card.suit;
        }

        // Move anti-clockwise around the table: bottom -> right -> top -> left.
        gameState.currentPlayer = (gameState.currentPlayer + 3) % 4;
        gameState.lastPlayedPlayerId = playerObj.id;

        // Update UI and show played card
        updateUI();

        // Safe display: use the existing function if present, otherwise call fallback in displayPlayedCard
        displayPlayedCard(card, playerObj.id, gameState.trickCards.length);

        // If all players have played, determine hand winner
        if (gameState.trickCards.length === 4) {
            setTimeout(determineHandWinner, 1000);
        } else {
            // Continue with next player if it's AI - use safe wrapper
            const nextIsAI = !gameState.players[gameState.currentPlayer].isHuman;
            if (nextIsAI) {
                // prefer global if available
                const aiFn = (typeof window !== 'undefined' && typeof window.aiPlayTurn === 'function') ? window.aiPlayTurn :
                               (typeof aiPlayTurn === 'function' ? aiPlayTurn : null);
                if (aiFn) {
                    setTimeout(aiFn, 1000);
                } else {
                    console.warn('No aiPlayTurn function available to schedule.');
                }
            } else {
                setStatusMessage("Your turn - play a card");
            }
        }
    } catch (err) {
        console.error('playCard: unexpected error', err);
    }
}

function displayPlayedCard(card, playerId, playNumber) {
    try {
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
        gameState.lastPlayInfoByPlayer[playerId] = { card, playNumber };
        renderPlayerHistory(playerId);

        // increment counters used to compute z-index
        gameState.playSeqCounter = (gameState.playSeqCounter || 0) + 1;
        gameState.playCountByPlayer[playerId] = (gameState.playCountByPlayer[playerId] || 0) + 1;

        const positions = {
            1: 'bottom',
            2: 'left',
            3: 'top',
            4: 'right'
        };

        const position = positions[playerId] || 'bottom';
        $('.trick-area .played-card.last-played-card').removeClass('last-played-card');
        const cardElement = createCardElement(card, false);
        cardElement.addClass('played-card last-played-card')
            .attr('data-player-id', playerId)
            .attr('data-play-number', playNumber)
            .attr('aria-label', `${gameState.players.find(player => player.id === playerId).name} played ${card.rank} of ${card.suit}`)
            .attr('title', `${gameState.players.find(player => player.id === playerId).name} played ${card.rank} of ${card.suit}`);
        cardElement.append($('<span class="play-sequence"></span>').text(playNumber));

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

        // Keep most of each played card on its player's side of the center.
        const cardLength = parseFloat(getComputedStyle(document.documentElement)
            .getPropertyValue('--card-height')) || 120;
        const inwardOffset = cardLength * 0.4;
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
    
    // Add all trick cards to table cards
    gameState.trickCards.forEach(trick => {
        gameState.tableCards.push(trick.card);
    });
    
    gameState.handsPlayed += 1;
    gameState.totalHandsPlayed += 1;
    gameState.handIndex = Math.floor(gameState.tableCards.length / 4);
    
    // Update hand winners list
    addHandWinner(winningPlayer.name, winningTeam);
    
    // Handle scoring based on the new rules — pass winningPlayerId so scoring knows which partner holds lead
    handleScoring(winningTeam, winningPlayerId);
    
    setStatusMessage(`${winningPlayer.name} (Team ${winningTeam}) wins the hand!`);
    
    // Check if game is over (all cards played)
    const totalCardsRemaining = gameState.players.reduce((total, player) => total + player.cards.length, 0);
    if (totalCardsRemaining === 0) {
        endGame();
        return;
    }
    
    // Start new hand with winner leading
    gameState.currentPlayer = gameState.players.findIndex(p => p.id === winningPlayerId);
    gameState.trickCards = [];
    gameState.ledSuit = null;
    
    // Update UI and continue
    updateUI();
    
    // If the next player is AI, have them play after a delay
    if (!gameState.players[gameState.currentPlayer].isHuman) {
        setTimeout(aiPlayTurn, 1500);
    } else {
        setStatusMessage("Your turn - play a card");
    }
}

// Replace handleScoring with partner-lead-aware logic
function handleScoring(winningTeam, winningPlayerId) {
    // Add 1 point to the stack for this hand
    gameState.stackedPoints += 1;

    // If no active challenge team yet, start it and set the lead-holder as the winning player
    if (gameState.currentChallengeTeam === null) {
        gameState.currentChallengeTeam = winningTeam;
        gameState.consecutiveWins = 1;
        gameState.leadHolderPlayerId = winningPlayerId;
        // update UI counters
        gameState.team1Consecutive = (winningTeam === 1) ? 1 : 0;
        gameState.team2Consecutive = (winningTeam === 2) ? 1 : 0;
        setStatusMessage(`Team ${winningTeam} starts the challenge! ${gameState.players.find(p=>p.id===winningPlayerId).name} holds the lead. Stack: ${gameState.stackedPoints}`);
        updateUI();
        return;
    }

    // If same team wins again
    if (winningTeam === gameState.currentChallengeTeam) {
        // If same player as current lead-holder wins, it's a true consecutive by same leader
        if (gameState.leadHolderPlayerId === winningPlayerId) {
            gameState.consecutiveWins += 1;
        } else {
            // Partner took the lead mid-run: update lead holder and reset consecutive wins.
            // Now the new lead-holder must win again to complete the run.
            gameState.leadHolderPlayerId = winningPlayerId;
            gameState.consecutiveWins = 1;
            setStatusMessage(`${gameState.players.find(p=>p.id===winningPlayerId).name} took the lead for Team ${winningTeam}. They must win the next hand to claim the stack.`);
            // Update UI team counters
            if (winningTeam === 1) {
                gameState.team1Consecutive = gameState.consecutiveWins;
                gameState.team2Consecutive = 0;
            } else {
                gameState.team2Consecutive = gameState.consecutiveWins;
                gameState.team1Consecutive = 0;
            }
            updateUI();
            return;
        }

        // Update team-specific consecutive counters for UI
        if (winningTeam === 1) {
            gameState.team1Consecutive = gameState.consecutiveWins;
            gameState.team2Consecutive = 0;
        } else {
            gameState.team2Consecutive = gameState.consecutiveWins;
            gameState.team1Consecutive = 0;
        }

        // Determine required wins dynamically:
        let requiredWins;
        if (gameState.currentStake === 2) {
            requiredWins = 2;
        } else {
            requiredWins = (gameState.stackedPoints >= 3) ? 2 : 3;
        }

        if (gameState.consecutiveWins >= requiredWins) {
            // Award all stacked points to the winning team
            if (winningTeam === 1) {
                gameState.team1Points += gameState.stackedPoints;
            } else {
                gameState.team2Points += gameState.stackedPoints;
            }

            setStatusMessage(`Team ${winningTeam} wins ${gameState.stackedPoints} points for ${requiredWins} consecutive wins!`);

            // Reset for next stake and clear the table immediately (UI will also refresh)
            resetTable();

            // Move to Stake 2 if we were in Stake 1
            if (gameState.currentStake === 1) {
                gameState.currentStake = 2;
                gameState.stake1Completed = true;
            }

            // Ensure UI shows awarded points and cleared table
            updateUI();
        } else {
            setStatusMessage(`Team ${winningTeam} continues the challenge! Stack: ${gameState.stackedPoints} (Consecutive: ${gameState.consecutiveWins})`);
            updateUI();
        }
    } else {
        // Different team wins - they break the streak and take over; the winning player becomes new lead holder
        gameState.currentChallengeTeam = winningTeam;
        gameState.consecutiveWins = 1;
        gameState.leadHolderPlayerId = winningPlayerId;

        // Reset team-specific consecutive counters
        gameState.team1Consecutive = (winningTeam === 1) ? 1 : 0;
        gameState.team2Consecutive = (winningTeam === 2) ? 1 : 0;

        // ensure any initialLeadTeam (if present) is cleared
        gameState.initialLeadTeam = null;

        setStatusMessage(`Team ${winningTeam} breaks the streak! ${gameState.players.find(p=>p.id===winningPlayerId).name} leads with ${gameState.stackedPoints} points in stack.`);
        updateUI();
    }
}

function resetTable() {
    // Reset challenge state
    gameState.stackedPoints = 0;
    gameState.consecutiveWins = 0;
    gameState.team1Consecutive = 0;
    gameState.team2Consecutive = 0;
    gameState.currentChallengeTeam = null;
    
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

function addHandWinner(playerName, team) {
    const isConsecutive = (team === 1 && gameState.team1Consecutive > 1) || 
                         (team === 2 && gameState.team2Consecutive > 1);
    
    const winnerElement = $('<div class="hand-winner"></div>');
    winnerElement.addClass(`team${team}`);
    if (isConsecutive) {
        winnerElement.addClass('consecutive');
    }
    
    winnerElement.html(`
        <strong>Hand ${gameState.totalHandsPlayed}:</strong> ${playerName} (Team ${team})
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
        setStatusMessage(`Team ${gameState.currentChallengeTeam} claims ${gameState.stackedPoints} stacked points at game end!`);
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
    if (gameState.team1Points > gameState.team2Points) {
        winnerMessage = `Team 1 Wins!`;
        steakMessage = `Final Score: ${gameState.team1Points} - ${gameState.team2Points}`;
    } else if (gameState.team2Points > gameState.team1Points) {
        winnerMessage = `Team 2 Wins!`;
        steakMessage = `Final Score: ${gameState.team2Points} - ${gameState.team1Points}`;
    } else {
        // Tie condition
        winnerMessage = "It's a Tie!";
        steakMessage = `Both teams scored ${gameState.team1Points} points`;
    }
    
    // Show celebration
    $('#win-message').text(winnerMessage);
    $('#steak-display').text(steakMessage);
    $('#celebration').show();
    
    // Clear the table for the next game
    gameState.tableCards = [];
    gameState.handIndex = 0;
    $('.trick-area .played-card').remove();
    
    // Update UI
    updateUI();
}

// New: show rules inside the celebration overlay (reuses overlay UI)
function showRules() {
    const rulesHtml = `
        <h3 style="color:#ffd54f;margin-bottom:8px;">How to Play - RUNG</h3>
        <div style="color:#fff; text-align:left; line-height:1.4;">
            <p>RUNG (Court Piece) is a 4-player trick-taking card game played in teams of two. The deck has 52 cards.</p>
            <h6>Stakes</h6>
            <ul>
                <li><strong>Stake 1</strong>: 3 consecutive wins (1+1+1 points)</li>
                <li><strong>Stake 2</strong>: 2 consecutive wins (2 points)</li>
            </ul>
            <h6>Gameplay</h6>
            <ul>
                <li>Players play one card per hand in anti-clockwise order.</li>
                <li>Follow suit if you can.</li>
                <li>Cards accumulate in the stack; consecutive wins claim the stack.</li>
                <li>Trump suit beats led suit; within suit higher rank wins (A high).</li>
            </ul>
            <h6>Goal</h6>
            <p>Collect the stacked points by achieving required consecutive wins as per the current stake.</p>
        </div>
    `;
    // populate rules content area
    $('#rules-content').html(rulesHtml).show();
    // hide trophy/win message when showing rules, keep play-again button visible to close
    $('#win-message').hide();
    $('#steak-display').hide();
    $('#celebration').show();
}

// When the celebration overlay is hidden or reused for real game-over, ensure we restore display elsewhere
$('#celebration').on('hide.bs.modal', function() {
    // If this was a game-over celebration, ensure final scores are visible
    if (gameState.gameState === "GAME_END") {
        $('#win-message').show();
        $('#steak-display').show();
    }
});

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
        gameState.currentPlayer = 0; // human starts
        setStatusMessage(`Trump is ${SUIT_SYMBOLS[chosenSuit]} - Your turn to play`);
        updateUI();
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
        if (gameState.gameState !== "PLAYING") return;
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
    // ensure aiPlayCard has a minimal fallback so other AI wrappers can call it
    if (typeof window.aiPlayCard !== 'function' && typeof aiPlayCard !== 'function') {
        window.aiPlayCard = function(player) {
            if (!player || !player.cards || !player.cards.length) return null;
            // follow suit if possible
            if (gameState.ledSuit) {
                const same = player.cards.filter(c => c.suit === gameState.ledSuit);
                if (same.length) return same[Math.floor(Math.random() * same.length)];
            }
            return player.cards[Math.floor(Math.random() * player.cards.length)];
        };
    }
}

// New: begin the current player's turn (shows status and triggers AI if needed)
function startTurn() {
    try {
        // ensure UI is up to date
        updateUI();

        // default to human (index 0) if currentPlayer is invalid
        if (typeof gameState.currentPlayer !== 'number' || gameState.currentPlayer < 0 || gameState.currentPlayer > 3) {
            gameState.currentPlayer = 0;
        }

        const current = gameState.players[gameState.currentPlayer];
        if (!current) return;

        if (current.isHuman) {
            setStatusMessage("Your turn - play a card");
        } else {
            setStatusMessage(`${current.name} is playing...`);
            // Use safe exposed AI play function
            const aiFn = (typeof window !== 'undefined' && typeof window.aiPlayTurn === 'function') ? window.aiPlayTurn
                        : (typeof aiPlayTurn === 'function' ? aiPlayTurn : null);
            if (aiFn) {
                setTimeout(aiFn, 1000);
            } else {
                console.warn('startTurn: no aiPlayTurn available');
            }
        }
    } catch (err) {
        console.error('startTurn error', err);
    }
}