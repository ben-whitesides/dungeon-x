// ============================================================
// DUNGEON X — NPC & EVENT SYSTEM MODULE
// NPCs with persistent relationships, dungeon events, traps
// Load after dungeon-x-phase3.html globals (PLAYER, GAME, rollDice, mod)
// Exposes: window.DX_NPC, window.DX_EVENTS
// Version 0.1.0
// ============================================================

(function() {
  'use strict';

  // ----------------------------------------------------------
  // SHARED UTILITIES
  // ----------------------------------------------------------

  function roll(sides) {
    return Math.floor(Math.random() * sides) + 1;
  }

  function d20() {
    return roll(20);
  }

  function abilityMod(stat) {
    return Math.floor((stat - 10) / 2);
  }

  function rollDamage(rolls, dice) {
    var total = 0;
    for (var i = 0; i < rolls; i++) {
      total += roll(dice);
    }
    return total;
  }

  // Seeded PRNG for deterministic placement (mulberry32)
  function seedHash(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + ch;
      hash = hash | 0;
    }
    return hash >>> 0;
  }

  function mulberry32(seed) {
    return function() {
      seed |= 0;
      seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function pickSeeded(arr, rng) {
    return arr[Math.floor(rng() * arr.length)];
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }


  // ============================================================
  // ============================================================
  //
  //  PART 1: DX_NPC — DUNGEON NPC HELPER SYSTEM
  //
  // ============================================================
  // ============================================================

  // ----------------------------------------------------------
  // NPC DIALOGUE DATA
  // ----------------------------------------------------------

  var SCRIBE_DIALOGUE = {
    stranger: [
      "Bless you, friend! These chains have held me... how long, I cannot say. I can read these walls \u2014 free me and I'll show you.",
      "You there! A living soul at last. The iron bites cold, but my mind is sharp still. These markings hold secrets older than the stones themselves.",
      "I am Elden, once keeper of the Archive of Ashenmoor. They chained me here for knowing too much. Ironic \u2014 it is knowledge that might save us both.",
      "Do not be frightened by my appearance. Captivity has been unkind, but my eyes still read what others cannot. Free me, and I shall prove my worth.",
      "The walls whisper, stranger. Can you not hear them? No \u2014 of course not. You lack the training. But I can translate their speech, if you would release me from these bonds.",
      "Another adventurer descends. They always do. Most walk past my cell without a glance. But you \u2014 you have stopped. That tells me something about your character.",
      "These chains were forged by hands that feared the written word. What fool imprisons a scholar? The same fools who built these walls and carved their secrets into them, I suppose.",
      "I have counted the stones in this cell nine thousand times. I have read every crack and shadow. Free me, and I shall share what the darkness has taught me."
    ],
    acquaintance: [
      "Ah, we meet again! The walls speak louder to those who listen. Let me show you what they say.",
      "The fates are kind \u2014 or perhaps cruel \u2014 to bring us together once more. No matter. I have studied new markings since last we spoke.",
      "My friend returns! I knew you would. The dungeon has a way of drawing kindred spirits together. Come, let me read this floor's secrets for you.",
      "You survived, then. Good. I feared the worst when the shadows grew thick. But look \u2014 new inscriptions here. The builders were prolific in their warnings.",
      "Each time we meet, I understand more of this place's terrible history. The markings on this floor speak of experiments \u2014 things best left buried. But forewarned is forearmed.",
      "I have been practising. Watch \u2014 I can read these symbols faster now. The ancient tongue comes back to me like a half-remembered dream. Every marking on this floor, I shall translate.",
      "The chains find me again, but your company makes them lighter. I have discovered a pattern in the wall-script \u2014 the builders used a cipher within a cipher. Clever. But not clever enough.",
      "You bring light to these dark places, both literally and figuratively. The markings here are denser than the last floor. I believe they were trying to warn someone \u2014 perhaps us."
    ],
    friend: [
      "My dear friend! I've been studying these markings since last we met. I believe they speak of a combination \u2014 elements woven together in ways the builders understood but dared not use openly.",
      "At last! I had hoped the dungeon would bring you back to me. I have deciphered something extraordinary \u2014 not merely a warning this time, but instructions. A spell combination, hidden in the stonework.",
      "The sight of you warms this old scholar's heart more than any torch. Listen carefully \u2014 the walls on this floor contain a revelation. The builders knew of elemental combinations that we have only begun to rediscover.",
      "My truest companion in this forsaken labyrinth! I have spent every waking hour since our last meeting pressing my fingers into the grooves of these carvings. What I found will change how you fight.",
      "You know, in all my years at the Archive, I never had a friend I could trust with forbidden knowledge. But you have earned that trust ten times over. Come close \u2014 this marking speaks of power.",
      "They cannot chain what I know, and what I know, I give freely to you. This floor's inscriptions reference a spell the old mages called 'the weaving' \u2014 two elements combined into something far greater.",
      "I have been composing a treatise in my mind \u2014 'On the Linguistic Patterns of Dungeon Builders, Volume One.' You shall be the first to hear its findings. More importantly, there is a spell combination carved right here.",
      "When they write the history of this dungeon's fall, they will note that a chained scholar and a brave adventurer cracked its deepest secrets together. Now, let me show you what the walls have been hiding.",
      "Do you know what separates a scholar from a fool? The scholar shares what he learns. I have learned much since our last meeting, and I share it gladly. The markings speak of combinations most have never dreamed of."
    ]
  };

  var ALCHEMIST_DIALOGUE = {
    stranger: [
      "Please... I was studying the arcane residue when they found me. If you've herbs or healing, I can teach you something of great value.",
      "Don't... don't step on the vials. They're all I have left. My name is Mira. I was a scholar of elemental synthesis before this place swallowed me whole.",
      "The pain is... considerable. But my mind is clear. Help me, and I will show you how elements combine in ways your battle-mages never imagined.",
      "I crawled here from the lower chambers. The things I saw there \u2014 no. First, help me. Then we talk. I know spell combinations that could save your life.",
      "You carry potions, yes? I can smell the reagents from here. Amateur brews, if you'll forgive my saying so. Help me stand and I'll teach you something worth ten of those bottles.",
      "I came seeking the Philosopher's Residue \u2014 traces of the old magic embedded in these walls. I found it. I also found the creatures that guard it. As you can see, they were less than hospitable.",
      "Every wound tells a story. Mine tells of hubris \u2014 a lone alchemist thinking she could study a living dungeon without consequence. But the knowledge I gained is real. Help me and it's yours.",
      "The blood loss is making the room spin, but I can still see the elemental traces in the air. Beautiful, actually, if one ignores the circumstances. A bit of healing and I can show you what they mean."
    ],
    acquaintance: [
      "You again! The dungeons keep pulling us together. Here \u2014 I've discovered something new since last we met.",
      "My returning hero! I prepared better this time \u2014 brought more supplies. Still got wounded, naturally, but I also brought a gift for you. A new combination I've been perfecting.",
      "I knew our paths would cross again. The dungeon's ley lines converge in predictable patterns if you know what to look for. As do old friends, it seems. I have new knowledge to share.",
      "The bruises heal faster each time. Or perhaps I've simply grown accustomed to pain. Either way \u2014 I've been experimenting since our last encounter, and the results are promising.",
      "You look stronger than before. Good \u2014 you'll need that strength for what lies below. But first, take this potion. I brewed it from reagents found only in these depths. And let me show you a new combination.",
      "Ha! I told myself, 'If I see that adventurer again, I'll have something truly special prepared.' And here you are. And here it is \u2014 a combination I tested on the cave spiders. They did not enjoy it.",
      "My notes have grown considerably since we last spoke. I've been documenting the elemental resonance of every chamber I pass through. One pattern in particular caught my eye \u2014 come, I'll show you.",
      "The dungeon provides, if you know where to look. I've gathered enough ingredients for a proper demonstration. Watch closely \u2014 this combination is elegant in its destruction."
    ],
    friend: [
      "My favorite adventurer! I've been experimenting. This combination? No one else knows it. Consider it a gift between friends.",
      "There you are! I've been saving my finest work for you. This potion \u2014 I call it the Alchemist's Promise. And this combination \u2014 I've never taught it to another living soul.",
      "I have dreamed of this moment. Not the wounded-on-the-floor part \u2014 that I could do without. But showing you this? A combination so potent it frightened even me? That's worth every scar.",
      "Between us, we know more about this dungeon's elemental architecture than the builders themselves. This combination \u2014 it uses that architecture against the dungeon's own creatures. Poetic, don't you think?",
      "I've stopped recording my most dangerous discoveries in my journal. Too risky. But I carry them in my mind, and I share them only with those I trust completely. That means you. Only you.",
      "Some alchemists spend lifetimes and never discover what I'm about to show you. A combination of elements so precise, so devastating, that the Old Academy banned its teaching. Fortunately, I was expelled from the Old Academy.",
      "My dear friend, take this rare draught \u2014 I've been aging it in dungeon moss, which sounds disgusting but produces remarkable results. And the combination I'm about to teach you? It will make you a force of nature.",
      "You know what they say about alchemists \u2014 we trust no one. That was true. Past tense. You changed that. So here, take my best potion, and learn the combination I swore I'd take to my grave.",
      "Every time we meet, I think: this is the combination that will turn the tide. And every time, I discover something even more powerful. What I have for you today \u2014 the creatures of this dungeon have no answer for it."
    ]
  };

  var GHOST_DIALOGUE = {
    ownGhost: [
      "Do I... know you? I was a {className} once. I fell on this very floor to a {enemyType}. Don't make my mistake \u2014 {advice}.",
      "You carry yourself like I once did. Full of purpose. I had purpose too, before the {enemyType} took it from me. {advice}. Perhaps you'll fare better.",
      "This place... I remember it. I remember the cold. I remember the {enemyType}'s eyes. I was a {className}, same as you might know. {advice} \u2014 promise me that.",
      "Strange \u2014 I feel as though I've met you before. Or will meet you. Time is peculiar when you're dead. I was {className}. Floor {floor} was my end. The {enemyType} \u2014 {advice}.",
      "Don't look at me with pity. I chose this life \u2014 and this death. I was a {className}. A good one, I think. But not good enough for the {enemyType}. {advice}, if you value your heartbeat.",
      "My weapons are gone. My body is gone. But my memories remain, sharp as any blade. I fought as a {className} on floor {floor}. The {enemyType} taught me humility. Too late, of course. {advice}.",
      "The living always look so surprised to see us. Yes, I'm dead. Yes, it's inconvenient. I was a {className}. The {enemyType} on floor {floor} ended my story. But yours continues \u2014 {advice}.",
      "I float here and I watch them come and go. Brave souls, foolish souls. I was one of them. {className}. Floor {floor}. The {enemyType} didn't give me time to scream. {advice}."
    ],
    randomGhost: [
      "I've wandered these halls since my death. The creatures below... they've changed. {warning}.",
      "Another warm body in the cold dark. How refreshing. I was an adventurer once \u2014 a lifetime ago, or perhaps last Tuesday. Time blurs when you're incorporeal. {warning}.",
      "Don't mind the translucency. It's a condition, not a choice. Listen \u2014 I've had nothing to do but observe since I died, and what I've observed is this: {warning}.",
      "You can see me? Most can't. Or won't. The living prefer to ignore what awaits them. But since you're here and listening \u2014 {warning}.",
      "I remember warmth. I remember hunger. I remember the sound of my own heartbeat. What I remember most clearly, though, is what killed me. {warning}.",
      "The dungeon reshapes itself, you know. Walls move when no one watches. Passages close. New ones open. But some things remain constant, and the dangers are one of them. {warning}.",
      "Envy is unbecoming of the dead, yet here I am, envying your solid form. Use it wisely. {warning}. I wish someone had told me.",
      "There's a chest in a room to the {direction}. I hid it there in my final moments, hoping someone worthy would find it. {warning} \u2014 but the treasure is real. I swear it on my grave, wherever that is."
    ]
  };

  var GHOST_ADVICE = [
    "Watch for their pattern \u2014 they attack in threes, then pause",
    "Keep your back to a wall if you can",
    "Don't waste your mana on flashy spells \u2014 precision kills surer than spectacle",
    "The creatures on this floor fear fire above all else",
    "Conserve your potions for the deeper floors \u2014 you'll need them",
    "There's a room where the torchlight flickers blue \u2014 that's where they nest",
    "If you hear scraping behind you, don't run \u2014 they're faster than you. Turn and fight",
    "The floor boss guards the stairs. Don't engage until you've cleared the smaller ones first"
  ];

  var GHOST_WARNINGS = [
    "The creatures on the floor below hunt in packs \u2014 never let them surround you",
    "There's a trap-laden corridor ahead. Hug the left wall if you value your ankles",
    "The deeper you go, the less your torch helps. They can see in perfect darkness. You cannot",
    "One of the rooms ahead has a false floor. The fall isn't fatal, but what waits at the bottom might be",
    "I've seen shadows move independently of their casters. Trust nothing in the dark",
    "The water in the lower chambers is not water. Do not drink it. Do not touch it",
    "There are markings on the walls down below \u2014 find the Scribe if you can, he reads what others cannot",
    "Some doors should remain closed. The ones with scratch marks on the inside? Those doors"
  ];

  var TRICKSTER_DIALOGUE = {
    firstMeeting: [
      "Well, well. A living soul down here. How delightful. I have something you want. The question is... what do you have for me?",
      "Don't be shy! Orin is my name, and trading is my game. Everything has value, friend \u2014 the trick is knowing to whom.",
      "Ah, a customer! Business has been dreadfully slow since the last adventurer ran screaming from this floor. No sense of commerce, that one. You, though \u2014 you look like someone who appreciates a fair exchange.",
      "Before you reach for your weapon \u2014 and I can see you're thinking about it \u2014 consider this: I have something that will help you survive. Violence won't get it. Conversation might.",
      "The dungeon provides many things. Pain, darkness, death. But also opportunity! I collect what others discard, and I offer it to those wise enough to trade. Are you wise enough?",
      "They call me a trickster. I prefer 'independent merchant operating in a non-traditional marketplace.' But names matter less than the goods, don't they? Let's see what we can arrange.",
      "I've been sitting in this corner for some time, waiting for someone who looks like they have interesting possessions. You qualify. Shall we do business?",
      "You know what I love about adventurers? Optimism. You walk into certain death carrying things you'll never use, while I sit here with exactly what you need. The universe has a sense of humor.",
      "Every trade I make, both parties walk away satisfied. Well, usually both parties. Almost always both parties. Let's not dwell on statistics \u2014 let's make a deal."
    ],
    beenTricked: [
      "Don't look at me like that. Business is business. But I'll make it up to you... maybe.",
      "Ah. You remember. I was hoping the trauma of the dungeon might have erased that particular transaction from your memory. No such luck, I see.",
      "Listen \u2014 what happened before was a... miscalculation of mutual benefit. This time will be different. Probably. Almost certainly. Shall we try again?",
      "That look in your eyes says you remember our last exchange. Your hand on your weapon says you're still upset about it. Both are valid. But consider: I have better goods this time.",
      "If it's any consolation, I felt terrible about our last trade. For nearly a full minute. But guilt is bad for business, and I have excellent stock today. Fresh from the lower chambers.",
      "You could hold a grudge, or you could make a profit. I know which one puts gold in your pocket and potions in your pack. The past is the past, friend. Let's discuss the future.",
      "I won't pretend I'm sorry \u2014 you wouldn't believe me anyway, and dishonesty between trading partners is unseemly. What I will say is: this time, the odds favor you. Mostly.",
      "The fact that you haven't stabbed me on sight tells me you're either very forgiving or very pragmatic. Either way, let's negotiate.",
      "Fool me once, shame on me. Fool me twice... well, you'd have to be foolish enough to trade with me again first. Are you? I have something genuinely remarkable this time."
    ],
    goodTrade: [
      "A fair exchange! May it serve you well. Until next time, traveler.",
      "See? I told you Orin deals fairly. Well \u2014 this time, at least. Pleasure doing business with you.",
      "Excellent! Both parties satisfied. That's the foundation of a lasting commercial relationship. Do come again \u2014 assuming you survive.",
      "There! Was that so difficult? A clean transaction, no tricks, no regrets. I'm as surprised as you are, frankly.",
      "You chose wisely, and so did I. This is what trade should look like. Now go \u2014 before I change my mind about the price.",
      "A handshake would be traditional, but I don't touch adventurers. Hygiene concerns. Nevertheless, consider this deal sealed and satisfactory.",
      "That item will serve you better than it served its previous owner. Then again, the previous owner is dead, so the bar is low. Good luck out there.",
      "You know, I could have charged more. But repeat customers are valuable, and live customers are rarer still. Consider the discount an investment in our future dealings."
    ],
    badTrade: [
      "Oh, you should see your face! Consider it a lesson in trust. Ta-ta!",
      "Ha! You know, I almost felt bad about that. Almost. Better luck next time, friend \u2014 if there is a next time!",
      "And THAT is why they call me the Trickster! Nothing personal. Well, slightly personal. But mostly professional.",
      "I'd say I'm sorry, but we both know that would be a lie, and I've already taken enough from you today. Farewell!",
      "The look of betrayal never gets old. It's like a fine wine \u2014 complex, layered, deeply satisfying. Thank you for that.",
      "Rule one of dungeon trading: never trust a man grinning in a dark corner. You'll know for next time. If there IS a next time!",
      "Don't take it personally! Take it educationally. You've just learned the most valuable lesson the dungeon offers: everyone is out for themselves.",
      "I'd wish you luck, but luck clearly isn't your strong suit today. Perhaps try prayer? I hear the Cleric's god occasionally listens!",
      "And with that, I bid you adieu! My grandmother always said, 'Orin, never steal from someone who can catch you.' You, my friend, are far too slow."
    ],
    mediocreResult: [
      "Well, it's not my finest offering, I'll grant you that. But it's honest goods for honest trade. More or less.",
      "Not my most impressive stock, I admit. But the dungeon economy is what it is. Supply and demand, friend.",
      "I've had better merchandise, and you've had worse days. We'll call it even, shall we?",
      "It's functional. It's useful. It's not exciting. Much like myself on a quiet Tuesday. Take it and be grateful.",
      "What? You expected a legendary artifact? From a trade in a dungeon corridor? Manage your expectations, friend.",
      "Look, I never promised gold and glory. I promised an exchange. This is an exchange. The marketplace has spoken.",
      "Some days you get the treasure. Some days you get... this. But it's better than nothing, and nothing is what the dungeon usually offers.",
      "A middling trade for middling times. But here's a secret \u2014 the modest items often prove more useful than the flashy ones. Probably."
    ]
  };

  // ----------------------------------------------------------
  // WALL MARKINGS DATA (for Scribe translations)
  // ----------------------------------------------------------

  var WALL_MARKINGS = [
    { text: "HERE FELL COMMANDER ASHYN, WHO BELIEVED THE DARKNESS COULD BE TAMED. IT COULD NOT.", hint: "Beware the shadows on this floor." },
    { text: "THREE STONES TURN, THE PASSAGE OPENS. LEFT, RIGHT, CENTER.", hint: "A hidden passage exists if you search carefully." },
    { text: "THE WATER REMEMBERS. THE FIRE FORGETS. COMBINE THEM NOT.", hint: "Fire and Ice combinations may react unpredictably here." },
    { text: "BELOW SLEEPS THE KEEPER. APPROACH WITH LIGHT OR DO NOT APPROACH.", hint: "Torch level matters against the floor boss." },
    { text: "THOSE WHO PRAY FIND STRENGTH. THOSE WHO STEAL FIND TEETH.", hint: "Shrines on this floor are blessed, not cursed." },
    { text: "THE WEST WALL WEEPS FOR WHAT IT HIDES.", hint: "Search the western walls for hidden caches." },
    { text: "COUNT THE SCRATCHES. EACH ONE WAS A SOUL.", hint: "Many have died here. Proceed with caution." },
    { text: "THE BUILDERS LEFT GIFTS FOR THE WORTHY AND TRAPS FOR THE GREEDY.", hint: "Some treasure is trapped. Approach carefully." }
  ];

  // ----------------------------------------------------------
  // POTIONS DATA (for Alchemist rewards)
  // ----------------------------------------------------------

  var COMMON_POTIONS = [
    { id: 'pot_heal', name: 'Healing Draught', type: 'potion', subtype: 'health', letter: 'P', color: 0xff4444, icon: 'icon_potion', healAmount: 8, description: 'Restores 8 HP' },
    { id: 'pot_mana', name: 'Mana Elixir', type: 'potion', subtype: 'mana', letter: 'M', color: 0x4444ff, icon: 'icon_potion_blue', manaAmount: 10, description: 'Restores 10 mana' },
    { id: 'pot_food', name: 'Trail Ration', type: 'food', letter: 'R', color: 0xddaa55, icon: 'icon_book', foodRestore: 30, waterRestore: 0, description: 'Restores 30 food' }
  ];

  var RARE_POTIONS = [
    { id: 'pot_greater_heal', name: 'Greater Healing Draught', type: 'potion', subtype: 'health', letter: 'P', color: 0xff2222, icon: 'icon_potion', healAmount: 20, description: 'Restores 20 HP' },
    { id: 'pot_resist', name: 'Potion of Resistance', type: 'potion', subtype: 'resist', letter: 'R', color: 0x22ff88, icon: 'icon_potion', resistTurns: 3, description: 'Half damage for 3 turns' },
    { id: 'pot_strength', name: 'Potion of Giant Strength', type: 'potion', subtype: 'strength', letter: 'S', color: 0xff8822, icon: 'icon_potion', strBonus: 4, duration: 5, description: '+4 STR for 5 turns' },
    { id: 'pot_sight', name: 'Potion of True Sight', type: 'potion', subtype: 'sight', letter: 'T', color: 0xffff44, icon: 'icon_potion', sightBonus: true, description: 'Reveals all traps and secrets on floor' }
  ];

  // ----------------------------------------------------------
  // TRICKSTER TRADE GOODS
  // ----------------------------------------------------------

  var GOOD_TRADE_ITEMS = [
    { id: 'trade_scroll', name: 'Scroll of Fireball', type: 'scroll', letter: 'S', color: 0xff6600, icon: 'icon_scroll', spellName: 'Fireball', description: 'One-use Fireball spell' },
    { id: 'trade_key', name: 'Skeleton Key', type: 'key', subtype: 'skeleton', letter: 'K', color: 0xffdd44, icon: 'icon_key', description: 'Opens any lock once' },
    { id: 'trade_weapon', name: 'Enchanted Dagger', type: 'weapon', letter: 'D', color: 0xaaccff, icon: 'icon_sword', damageDice: 6, damageBonus: 2, description: 'd6+2 magic dagger' },
    { id: 'trade_armor', name: 'Shadowweave Cloak', type: 'armor', letter: 'C', color: 0x6633aa, icon: 'icon_shield', acBonus: 2, description: '+2 AC shadow cloak' },
    { id: 'trade_potion_rare', name: 'Elixir of Vitality', type: 'potion', subtype: 'health', letter: 'E', color: 0xff44ff, icon: 'icon_potion', healAmount: 30, description: 'Restores 30 HP' }
  ];

  var MEDIOCRE_TRADE_ITEMS = [
    { id: 'trade_bread', name: 'Stale Bread', type: 'food', letter: 'B', color: 0xddaa55, icon: 'icon_book', foodRestore: 15, waterRestore: 0, description: 'Restores 15 food' },
    { id: 'trade_water', name: 'Murky Water', type: 'water', letter: 'W', color: 0x4488ff, icon: 'icon_potion_blue', foodRestore: 0, waterRestore: 20, description: 'Restores 20 water' },
    { id: 'trade_potion_weak', name: 'Weak Healing Potion', type: 'potion', subtype: 'health', letter: 'P', color: 0xff8888, icon: 'icon_potion', healAmount: 4, description: 'Restores 4 HP' },
    { id: 'trade_torch', name: 'Stubby Torch', type: 'torch', letter: 'T', color: 0xff8800, icon: 'icon_key', torchRestore: 15, description: 'Restores 15 torch' }
  ];

  // ----------------------------------------------------------
  // DUNGEON THEME NPC WEIGHTS
  // ----------------------------------------------------------

  var NPC_WEIGHTS_BY_DUNGEON = {
    1: { scribe: 30, alchemist: 25, ghost: 30, trickster: 15 },  // Whispering Crypts: favor ghosts + scholars
    2: { scribe: 15, alchemist: 25, ghost: 20, trickster: 40 },  // Warrens: favor tricksters
    3: { scribe: 25, alchemist: 30, ghost: 25, trickster: 20 },  // Default balanced
    4: { scribe: 20, alchemist: 20, ghost: 40, trickster: 20 },  // Haunted: favor ghosts
    5: { scribe: 35, alchemist: 25, ghost: 20, trickster: 20 }   // Arcane: favor scribe
  };

  function getDefaultWeights() {
    return { scribe: 25, alchemist: 25, ghost: 25, trickster: 25 };
  }

  // ----------------------------------------------------------
  // NPC CORE
  // ----------------------------------------------------------

  var npc = {

    // ----------------------------------------------------------
    // getRelationshipTier: stranger / acquaintance / friend
    // ----------------------------------------------------------
    getRelationshipTier: function(meetCount) {
      if (meetCount >= 4) return 'friend';
      if (meetCount >= 2) return 'acquaintance';
      return 'stranger';
    },

    // ----------------------------------------------------------
    // _getRelationship: fetch NPC relationship from meta
    // ----------------------------------------------------------
    _getRelationship: function(npcKey, metaData) {
      var meta = metaData || {};
      var rels = meta.npcRelationships || {};
      return rels[npcKey] || { meetCount: 0, lastInteraction: null, tricked: false, freed: false };
    },

    // ----------------------------------------------------------
    // _updateRelationship: save updated relationship back to meta
    // ----------------------------------------------------------
    _updateRelationship: function(npcKey, relData, metaData) {
      if (!metaData) return;
      if (!metaData.npcRelationships) metaData.npcRelationships = {};
      metaData.npcRelationships[npcKey] = relData;
      // Persist via DX_SAVE if available
      if (typeof window !== 'undefined' && window.DX_SAVE && window.DX_SAVE.saveMeta) {
        window.DX_SAVE.saveMeta(metaData);
      }
    },

    // ----------------------------------------------------------
    // generateEncounter: deterministic NPC placement for a floor
    // ----------------------------------------------------------
    generateEncounter: function(dungeonId, floor, seed, metaData) {
      var seedStr = String(dungeonId) + '-' + String(floor) + '-' + String(seed || '');
      var rng = mulberry32(seedHash(seedStr));

      // Determine if NPC appears on this floor
      var threshold;
      if (floor <= 1) threshold = 0.40;
      else if (floor <= 2) threshold = 0.60;
      else threshold = 0.80;

      var spawnRoll = rng();
      if (spawnRoll > threshold) {
        return null; // No NPC on this floor
      }

      // Pick NPC type by dungeon-weighted probability
      var weights = NPC_WEIGHTS_BY_DUNGEON[dungeonId] || getDefaultWeights();
      var totalWeight = weights.scribe + weights.alchemist + weights.ghost + weights.trickster;
      var pick = rng() * totalWeight;

      var npcType;
      if (pick < weights.scribe) {
        npcType = 'scribe';
      } else if (pick < weights.scribe + weights.alchemist) {
        npcType = 'alchemist';
      } else if (pick < weights.scribe + weights.alchemist + weights.ghost) {
        npcType = 'ghost';
      } else {
        npcType = 'trickster';
      }

      // Determine NPC name
      var npcName;
      switch (npcType) {
        case 'scribe': npcName = 'Elden'; break;
        case 'alchemist': npcName = 'Mira'; break;
        case 'trickster': npcName = 'Orin'; break;
        case 'ghost':
          var ghostIdentity = this.resolveGhostIdentity(metaData);
          npcName = ghostIdentity.name;
          break;
      }

      // Position: place NPC in a deterministic grid location
      var posX = Math.floor(rng() * 10) + 2;
      var posY = Math.floor(rng() * 10) + 2;

      var npcKey = npcType === 'ghost' ? 'ghost_' + npcName.toLowerCase().replace(/\s+/g, '_') : npcType;
      var relationship = this._getRelationship(npcKey, metaData);
      var tier = this.getRelationshipTier(relationship.meetCount);

      return {
        type: npcType,
        name: npcName,
        npcKey: npcKey,
        position: { x: posX, y: posY },
        dialogueState: 'idle',
        relationship: relationship,
        tier: tier,
        ghostIdentity: npcType === 'ghost' ? this.resolveGhostIdentity(metaData) : null
      };
    },

    // ----------------------------------------------------------
    // resolveGhostIdentity: check dead characters for ghost NPC
    // ----------------------------------------------------------
    resolveGhostIdentity: function(metaData) {
      var meta = metaData || {};
      var dead = meta.deadCharacters || [];

      if (dead.length > 0) {
        // Use the most recent dead character
        var ghost = dead[dead.length - 1];
        return {
          isOwnGhost: true,
          name: ghost.name || 'Unnamed Adventurer',
          className: ghost.class || 'Fighter',
          floor: ghost.floor || 1,
          dungeon: ghost.dungeon || 1,
          enemyType: 'the darkness',
          advice: pickRandom(GHOST_ADVICE),
          warning: pickRandom(GHOST_WARNINGS)
        };
      }

      // Random ghost NPC
      var ghostNames = ['Aldric the Unremembered', 'Sera of the Broken Oath', 'Old Dunwick', 'The Pale Wanderer', 'Corryn Half-Light'];
      return {
        isOwnGhost: false,
        name: pickRandom(ghostNames),
        className: null,
        floor: null,
        dungeon: null,
        enemyType: null,
        advice: pickRandom(GHOST_ADVICE),
        warning: pickRandom(GHOST_WARNINGS),
        direction: pickRandom(['north', 'south', 'east', 'west'])
      };
    },

    // ----------------------------------------------------------
    // getDialogue: get appropriate dialogue lines for context
    // ----------------------------------------------------------
    getDialogue: function(npcType, context, relationship) {
      var meetCount = (relationship && relationship.meetCount) || 0;
      var tier = this.getRelationshipTier(meetCount);

      switch (npcType) {
        case 'scribe':
          return pickRandom(SCRIBE_DIALOGUE[tier] || SCRIBE_DIALOGUE.stranger);

        case 'alchemist':
          return pickRandom(ALCHEMIST_DIALOGUE[tier] || ALCHEMIST_DIALOGUE.stranger);

        case 'ghost':
          var ghostData = context && context.ghostIdentity ? context.ghostIdentity : {};
          if (ghostData.isOwnGhost) {
            var line = pickRandom(GHOST_DIALOGUE.ownGhost);
            line = line.replace(/\{className\}/g, ghostData.className || 'adventurer');
            line = line.replace(/\{enemyType\}/g, ghostData.enemyType || 'the darkness');
            line = line.replace(/\{advice\}/g, ghostData.advice || 'be careful');
            line = line.replace(/\{floor\}/g, String(ghostData.floor || '?'));
            return line;
          } else {
            var gLine = pickRandom(GHOST_DIALOGUE.randomGhost);
            gLine = gLine.replace(/\{warning\}/g, ghostData.warning || 'be wary of what lies below');
            gLine = gLine.replace(/\{direction\}/g, ghostData.direction || 'north');
            return gLine;
          }

        case 'trickster':
          var tricked = relationship && relationship.tricked;
          if (tricked) {
            return pickRandom(TRICKSTER_DIALOGUE.beenTricked);
          }
          return pickRandom(TRICKSTER_DIALOGUE.firstMeeting);

        default:
          return "...";
      }
    },

    // ----------------------------------------------------------
    // interact: handle NPC interaction, return result + dialogue
    // ----------------------------------------------------------
    interact: function(npcType, player, metaData) {
      var meta = metaData || {};
      var npcKey;

      switch (npcType) {
        case 'scribe': npcKey = 'scribe'; break;
        case 'alchemist': npcKey = 'alchemist'; break;
        case 'trickster': npcKey = 'trickster'; break;
        case 'ghost':
          var ghostId = this.resolveGhostIdentity(meta);
          npcKey = 'ghost_' + ghostId.name.toLowerCase().replace(/\s+/g, '_');
          break;
        default: npcKey = npcType;
      }

      var rel = this._getRelationship(npcKey, meta);
      var tier = this.getRelationshipTier(rel.meetCount);
      var result = {
        npcType: npcType,
        npcKey: npcKey,
        tier: tier,
        dialogue: [],
        rewards: [],
        effects: [],
        success: true
      };

      // Greeting dialogue
      var greeting = this.getDialogue(npcType, { ghostIdentity: this.resolveGhostIdentity(meta) }, rel);
      result.dialogue.push(greeting);

      // NPC-specific interaction logic
      switch (npcType) {
        case 'scribe':
          result = this._interactScribe(result, player, rel, tier, meta);
          break;
        case 'alchemist':
          result = this._interactAlchemist(result, player, rel, tier, meta);
          break;
        case 'ghost':
          result = this._interactGhost(result, player, rel, meta);
          break;
        case 'trickster':
          result = this._interactTrickster(result, player, rel, meta);
          break;
      }

      // Update relationship
      rel.meetCount++;
      rel.lastInteraction = new Date().toISOString();
      this._updateRelationship(npcKey, rel, meta);

      return result;
    },

    // ----------------------------------------------------------
    // SCRIBE INTERACTION
    // ----------------------------------------------------------
    _interactScribe: function(result, player, rel, tier, meta) {
      // Check if player can free the scribe
      var canFree = false;
      var freeMethod = '';

      if (rel.freed) {
        canFree = true;
        freeMethod = 'already_freed';
        result.dialogue.push("The chains are gone, but Elden waits in his familiar spot, poring over the stonework with scholarly intensity.");
      } else {
        // Check for key
        var hasKey = false;
        if (player && player.inventory) {
          for (var i = 0; i < player.inventory.length; i++) {
            if (player.inventory[i].type === 'key') {
              hasKey = true;
              break;
            }
          }
        }

        // Fighter strength check
        var isStrong = player && player.class === 'Fighter';
        if (isStrong) {
          var strCheck = d20() + abilityMod(player.str || 10);
          if (strCheck >= 14) {
            canFree = true;
            freeMethod = 'strength';
            result.dialogue.push("You grip the chains and pull. The iron groans, bends, and finally snaps. Elden gasps with relief.");
            result.effects.push({ type: 'strength_check', success: true, roll: strCheck });
          } else {
            result.dialogue.push("You strain against the chains, but the iron holds firm. Perhaps a key would serve better.");
            result.effects.push({ type: 'strength_check', success: false, roll: strCheck });
          }
        }

        if (!canFree && hasKey) {
          canFree = true;
          freeMethod = 'key';
          result.dialogue.push("The key turns with a satisfying click. The chains fall away, and Elden stretches his aching limbs.");
          result.effects.push({ type: 'key_used' });
        }

        if (!canFree && !isStrong) {
          result.dialogue.push("The chains hold fast. You would need a key or considerable strength to free this man.");
          result.success = false;
          return result;
        }
      }

      if (canFree) {
        rel.freed = true;

        // Translate markings
        if (tier === 'stranger') {
          // Translate 1 marking
          var marking = pickRandom(WALL_MARKINGS);
          result.dialogue.push("Elden traces his fingers along the wall carvings, muttering in a language older than memory.");
          result.dialogue.push('"The inscription reads: ' + marking.text + '"');
          result.dialogue.push('"In simpler terms: ' + marking.hint + '"');
          result.rewards.push({ type: 'knowledge', data: marking });
        } else if (tier === 'acquaintance') {
          // Translate ALL markings on floor
          result.dialogue.push("Elden moves from wall to wall with practiced ease, reading every inscription he can find.");
          for (var m = 0; m < Math.min(3, WALL_MARKINGS.length); m++) {
            var mk = WALL_MARKINGS[m];
            result.dialogue.push('"Marking ' + (m + 1) + ': ' + mk.text + '"');
            result.rewards.push({ type: 'knowledge', data: mk });
          }
          result.dialogue.push("Elden pauses thoughtfully. \"There are patterns here. The builders were trying to warn someone. I suspect that someone is you.\"");
        } else {
          // Friend: translate ALL + hint at spell combo
          result.dialogue.push("Elden's eyes light up as he reads the walls with the fervor of a scholar rediscovering a lost text.");
          for (var f = 0; f < Math.min(3, WALL_MARKINGS.length); f++) {
            var fk = WALL_MARKINGS[f];
            result.dialogue.push('"' + fk.text + '"');
            result.rewards.push({ type: 'knowledge', data: fk });
          }

          // Spell combo hint
          var combos = ['Fire+Wind', 'Ice+Stone', 'Light+Shadow', 'Fire+Stone', 'Wind+Ice', 'Shadow+Wind'];
          var knownCombos = (meta && meta.knownCombos) || [];
          var unknownCombos = [];
          for (var c = 0; c < combos.length; c++) {
            if (knownCombos.indexOf(combos[c]) === -1) {
              unknownCombos.push(combos[c]);
            }
          }
          if (unknownCombos.length > 0) {
            var combo = pickRandom(unknownCombos);
            var parts = combo.split('+');
            result.dialogue.push('"But here \u2014 this is the true treasure. The markings speak of combining ' + parts[0] + ' and ' + parts[1] + ' into something magnificent. I believe this is what the old mages called a \'weaving.\'"');
            result.rewards.push({ type: 'spell_combo_hint', combo: combo, elements: parts });
          } else {
            result.dialogue.push('"You already know every combination the walls speak of. I am impressed, friend. Truly."');
          }
        }
      }

      return result;
    },

    // ----------------------------------------------------------
    // ALCHEMIST INTERACTION
    // ----------------------------------------------------------
    _interactAlchemist: function(result, player, rel, tier, meta) {
      var isCleric = player && player.class === 'Cleric';

      // Healing interaction
      if (isCleric) {
        result.dialogue.push("You channel divine energy into her wounds. The cuts close, the bruises fade. Mira's eyes widen with gratitude.");
        result.effects.push({ type: 'cleric_heal', bonus: true });
      } else {
        result.dialogue.push("You offer what aid you can. Mira winces but nods her thanks as the worst of the pain subsides.");
        result.effects.push({ type: 'basic_heal', bonus: false });
      }

      // Teach a spell combination
      var combos = ['Fire+Wind', 'Ice+Stone', 'Light+Shadow', 'Fire+Stone', 'Wind+Ice', 'Shadow+Wind'];
      var knownCombos = (meta && meta.knownCombos) || [];
      var unknownCombos = [];
      for (var c = 0; c < combos.length; c++) {
        if (knownCombos.indexOf(combos[c]) === -1) {
          unknownCombos.push(combos[c]);
        }
      }

      if (unknownCombos.length > 0) {
        var combo = pickRandom(unknownCombos);
        var parts = combo.split('+');
        result.dialogue.push("Mira draws symbols in the dust with a shaking finger. \"Watch. When " + parts[0] + " meets " + parts[1] + ", something extraordinary happens. I call it... well, you'll see when you try it.\"");
        result.rewards.push({ type: 'spell_combo', combo: combo, elements: parts });
        result.effects.push({ type: 'learn_combo', combo: combo });
      } else {
        result.dialogue.push("\"You know every combination I could teach! I'm both proud and slightly offended. Here \u2014 take a potion instead. My ego will recover.\"");
      }

      // Give potion based on tier
      if (tier === 'stranger') {
        var potion = pickRandom(COMMON_POTIONS);
        result.dialogue.push("She presses a small vial into your hand. \"" + potion.name + ". It's not much, but it's honestly brewed.\"");
        result.rewards.push({ type: 'item', item: JSON.parse(JSON.stringify(potion)) });
      } else if (tier === 'acquaintance') {
        var acqPotion = pickRandom(COMMON_POTIONS);
        result.dialogue.push("\"I brewed this between our meetings. " + acqPotion.name + " \u2014 take it, with my thanks for returning.\"");
        result.rewards.push({ type: 'item', item: JSON.parse(JSON.stringify(acqPotion)) });
        // Second potion for repeat visitors
        var bonus = pickRandom(COMMON_POTIONS);
        result.dialogue.push("\"Oh, and take this as well. Consider it a loyalty bonus.\" She hands you a " + bonus.name + ".");
        result.rewards.push({ type: 'item', item: JSON.parse(JSON.stringify(bonus)) });
      } else {
        // Friend tier: rare potion
        var rarePotion = pickRandom(RARE_POTIONS);
        result.dialogue.push("\"This? This is my masterwork. " + rarePotion.name + ". " + rarePotion.description + ". I've been saving it for someone worthy.\"");
        result.rewards.push({ type: 'item', item: JSON.parse(JSON.stringify(rarePotion)) });
      }

      // Cleric bonus: extra rare potion + lore
      if (isCleric) {
        var clericBonus = pickRandom(RARE_POTIONS);
        result.dialogue.push("\"Your healing \u2014 it was divine. Literally. The wounds you mended were beyond mortal alchemy. Take this \u2014 " + clericBonus.name + ". And know this: the creatures below fear holy light more than they fear any blade.\"");
        result.rewards.push({ type: 'item', item: JSON.parse(JSON.stringify(clericBonus)) });
        result.rewards.push({ type: 'lore', text: 'Undead creatures on lower floors take extra damage from holy-element spells and Cleric abilities.' });
      }

      return result;
    },

    // ----------------------------------------------------------
    // GHOST INTERACTION
    // ----------------------------------------------------------
    _interactGhost: function(result, player, rel, meta) {
      var ghostData = this.resolveGhostIdentity(meta);

      if (ghostData.isOwnGhost) {
        // Player's own dead character as ghost
        result.dialogue.push("The ghost flickers, its form shifting between translucent and almost-solid. Something in its eyes is painfully familiar.");

        // What killed them
        result.dialogue.push("\"The " + ghostData.enemyType + " came from the shadows. I never saw it until teeth found flesh. Floor " + ghostData.floor + " is where my story ended.\"");

        // Warning about upcoming floor
        var warning = pickRandom(GHOST_WARNINGS);
        result.dialogue.push("\"But you \u2014 you still breathe. So listen: " + warning + "\"");

        // Hidden chest hint
        result.dialogue.push("\"Before I fell, I hid what I could. Search the corners of this floor carefully. Not everything valuable is guarded by monsters.\"");
        result.rewards.push({ type: 'hint', hint: 'hidden_chest', description: 'A hidden cache exists on this floor.' });

        // Personal advice based on class
        var advice = ghostData.advice || 'keep your wits about you';
        result.dialogue.push("\"One last thing, from one adventurer to another: " + advice + ". I wish someone had told me that.\"");
        result.rewards.push({ type: 'knowledge', data: { hint: advice } });
      } else {
        // Random ghost NPC
        result.dialogue.push("The ghost hovers, its edges blurring into the dungeon's cold air. It seems to study you with hollow, knowing eyes.");

        var rWarning = ghostData.warning || 'the floor below holds terrors you cannot imagine';
        result.dialogue.push("\"" + rWarning + "\"");
        result.rewards.push({ type: 'warning', text: rWarning });

        // Hidden chest location
        var dir = ghostData.direction || 'north';
        result.dialogue.push("\"I left something behind when I died. To the " + dir + ", behind a loose stone. Take it \u2014 I have no use for material things any longer.\"");
        result.rewards.push({ type: 'hint', hint: 'hidden_chest_' + dir, description: 'A hidden cache lies to the ' + dir + '.' });

        // Additional lore
        result.dialogue.push("\"This dungeon... it breathes. It remembers. And it hungers. Never forget that the walls themselves are watching.\"");
      }

      return result;
    },

    // ----------------------------------------------------------
    // TRICKSTER INTERACTION
    // ----------------------------------------------------------
    _interactTrickster: function(result, player, rel, meta) {
      // Trickster offers a trade
      result.dialogue.push("Orin produces a small bundle wrapped in cloth, dangling it just out of reach. His grin is infectious and unsettling in equal measure.");
      result.dialogue.push("\"Simple terms: you give me something from that pack of yours, and I give you this. One item for one item. What say you?\"");

      // Store the deal parameters for resolution
      result.effects.push({
        type: 'trickster_offer',
        requiresPlayerChoice: true,
        description: 'Choose an item from inventory to trade, or decline.'
      });

      return result;
    },

    // ----------------------------------------------------------
    // resolveTricksterDeal: roll for trade outcome with CHA mod
    // ----------------------------------------------------------
    resolveTricksterDeal: function(player) {
      var chaMod = abilityMod(player.cha || 10);
      var baseGoodChance = 60;
      var baseMedChance = 25;
      var baseBadChance = 15;

      // CHA modifier adjusts good odds by 5% per point
      var goodChance = clamp(baseGoodChance + (chaMod * 5), 20, 85);
      var badChance = clamp(baseBadChance - (chaMod * 3), 5, 40);
      var medChance = 100 - goodChance - badChance;

      var rollResult = Math.random() * 100;
      var outcome;
      var item;
      var dialogue;

      if (rollResult < goodChance) {
        outcome = 'good';
        item = JSON.parse(JSON.stringify(pickRandom(GOOD_TRADE_ITEMS)));
        item.id = item.id + '_' + Date.now();
        dialogue = pickRandom(TRICKSTER_DIALOGUE.goodTrade);
      } else if (rollResult < goodChance + medChance) {
        outcome = 'mediocre';
        item = JSON.parse(JSON.stringify(pickRandom(MEDIOCRE_TRADE_ITEMS)));
        item.id = item.id + '_' + Date.now();
        dialogue = pickRandom(TRICKSTER_DIALOGUE.mediocreResult);
      } else {
        outcome = 'bad';
        item = null;
        dialogue = pickRandom(TRICKSTER_DIALOGUE.badTrade);
      }

      return {
        outcome: outcome,
        item: item,
        dialogue: dialogue,
        roll: rollResult,
        goodChance: goodChance,
        medChance: medChance,
        badChance: badChance,
        chaMod: chaMod
      };
    }
  };


  // ============================================================
  // ============================================================
  //
  //  PART 2: DX_EVENTS — DUNGEON EVENT SYSTEM
  //
  // ============================================================
  // ============================================================

  // ----------------------------------------------------------
  // ENVIRONMENTAL EVENTS
  // ----------------------------------------------------------

  var ENVIRONMENTAL_EVENTS = {
    cave_in: {
      id: 'cave_in',
      type: 'environmental',
      name: 'Cave-In',
      triggerType: 'movement',
      descriptions: [
        "The ceiling groans \u2014 a deep, stone-on-stone sound that vibrates through your teeth. Dust cascades in sheets. Then the rocks begin to fall.",
        "A crack spiders across the corridor ceiling. You hear it before you see it: the grinding, inevitable sound of stone giving way.",
        "The ground trembles. Pebbles bounce and dance at your feet. Then a slab the size of a coffin lid crashes down behind you."
      ],
      check: { ability: 'dex', dc: 13 },
      success: {
        texts: [
          "You dive clear as rubble crashes behind you. Dust billows, but you are unharmed.",
          "Instinct takes over. You roll sideways as tons of stone slam into the floor where you stood a heartbeat ago.",
          "Your reflexes save you. The cave-in seals the passage behind you, but your bones remain intact."
        ],
        effect: { path_blocked: true }
      },
      failure: {
        texts: [
          "Stones catch your shoulder and back. Pain shoots through your arm as the corridor fills with rubble.",
          "A falling slab clips your side. You taste dust and copper. The passage behind you is sealed.",
          "The rocks find you before you find cover. Bruised and bleeding, you crawl free of the debris."
        ],
        damage: { rolls: 1, dice: 6 },
        effect: { path_blocked: true }
      },
      classBonus: {
        ranger: { type: 'auto_detect', description: 'Ranger senses instability: "The ceiling... it\'s not sound. Move carefully."' },
        fighter: { type: 'reduced_damage', factor: 0.5, description: 'Fighter shrugs off the worst of the impact.' },
        mage: { type: 'magic_shield', description: 'A shimmer of arcane energy deflects the largest stones.' },
        cleric: { type: 'divine_ward', description: 'Divine light hardens around you like a shell, absorbing the blow.' }
      }
    },

    gas_cloud: {
      id: 'gas_cloud',
      type: 'environmental',
      name: 'Poison Gas',
      triggerType: 'door_open',
      descriptions: [
        "The door swings inward and a wall of sickly yellow-green vapor pours out. It stinks of sulfur and something worse \u2014 something organic.",
        "As the seal breaks, pressurized gas hisses from the doorframe. The air turns acrid and your eyes begin to water.",
        "A cloud of noxious fumes billows from the chamber beyond. The torchlight turns the gas an ugly, jaundiced color."
      ],
      check: { ability: 'con', dc: 12 },
      success: {
        texts: [
          "You hold your breath and push through. Your lungs burn, but the poison fails to take root.",
          "Years of hard living have toughened your constitution. The gas stings but does not poison.",
          "You press your sleeve to your face and power through the cloud. The worst passes quickly."
        ],
        effect: {}
      },
      failure: {
        texts: [
          "The gas sears your lungs. You cough, retch, and feel the poison working its way into your blood.",
          "You inhale before you can stop yourself. Fire spreads through your chest. The room spins.",
          "The toxin hits fast. Your vision blurs and your knees buckle. The poison will take time to clear."
        ],
        damage: { rolls: 2, dice: 4 },
        effect: { poisoned: true, duration: 2 }
      },
      classBonus: {
        ranger: { type: 'auto_detect', description: 'Ranger smells the gas before the door opens: "Wait \u2014 something foul on the other side."' },
        fighter: { type: 'reduced_damage', factor: 0.5, description: 'Fighter\'s endurance reduces the poison\'s impact.' },
        mage: { type: 'magic_shield', description: 'A quick incantation creates a bubble of clean air.' },
        cleric: { type: 'divine_ward', description: 'Holy light purifies the air as it reaches your lungs.' }
      }
    },

    water_flood: {
      id: 'water_flood',
      type: 'environmental',
      name: 'Rising Water',
      triggerType: 'pressure_plate',
      descriptions: [
        "Your foot depresses a stone tile and you hear the distant rumble of machinery. Water begins to pour from grates in the walls.",
        "A click beneath your boot. Then the sound of rushing water \u2014 not a trickle, but a torrent, flooding in from hidden channels.",
        "The pressure plate sinks beneath your weight. Somewhere deep in the walls, ancient pipes groan to life. Water rises fast."
      ],
      check: { ability: 'int', dc: 14 },
      success: {
        texts: [
          "You spot the drainage mechanism and wrench it open. The water drains as quickly as it rose.",
          "The flooding pattern reveals the puzzle \u2014 three stones, pressed in sequence, seal the water gates.",
          "You trace the water's source to a cracked pipe and jam your torch into the gap. The flow stops."
        ],
        effect: { puzzle_solved: true }
      },
      failure: {
        texts: [
          "The water rises to your waist, then your chest. You fight to keep your head above the surface as the room floods.",
          "Cold water fills the chamber faster than you can think. You gulp air and brace against the current.",
          "The flood takes your footing. You're swept against the far wall, swallowing mouthfuls of stale, freezing water."
        ],
        damage: { rolls: 1, dice: 8 },
        effect: { drowning_risk: true, turns: 3 }
      },
      classBonus: {
        ranger: { type: 'auto_detect', description: 'Ranger spots the pressure plate: "Don\'t step \u2014 there. See the seam?"' },
        fighter: { type: 'reduced_damage', factor: 0.5, description: 'Fighter braces against the current, taking reduced damage.' },
        mage: { type: 'magic_shield', description: 'Mage parts the water with a gesture, creating a dry corridor.' },
        cleric: { type: 'divine_ward', description: 'Divine warmth evaporates the water before it can do harm.' }
      }
    },

    darkness_surge: {
      id: 'darkness_surge',
      type: 'environmental',
      name: 'Darkness Surge',
      triggerType: 'deep_floor',
      descriptions: [
        "The torchlight flickers violently, then dims to a guttering ember. The darkness thickens like fog \u2014 tangible, oppressive, alive.",
        "A wave of shadow rolls through the corridor like a physical thing. Your torch shrinks to a pitiful glow. Something in the dark stirs.",
        "The light dies in stages \u2014 first the edges, then the middle, until your torch casts barely enough light to see your own hand."
      ],
      check: { ability: 'wis', dc: 13 },
      success: {
        texts: [
          "You steady your breathing and focus. The darkness presses close but cannot reach your spirit.",
          "Your willpower holds the shadows at bay. The torch recovers slowly, and the darkness retreats.",
          "You refuse to yield to fear. The surge passes, and the light returns, diminished but present."
        ],
        effect: { torch_dimmed: true, duration: 30, factor: 0.5 }
      },
      failure: {
        texts: [
          "The darkness swallows you whole. Your torch is a memory. Something brushes past you in the black.",
          "Panic takes hold as the light vanishes completely. You swing blindly at sounds that may or may not be real.",
          "The shadows are not empty. Things move in them \u2014 things with cold fingers and hungry voices."
        ],
        damage: { rolls: 1, dice: 4 },
        effect: { torch_dimmed: true, duration: 60, factor: 0.25, shadow_empowered: true }
      },
      classBonus: {
        ranger: { type: 'auto_detect', description: 'Ranger senses the approaching darkness: "Something is coming. Something without form."' },
        fighter: { type: 'reduced_damage', factor: 0.5, description: 'Fighter stands firm even blind, taking half damage from shadow strikes.' },
        mage: { type: 'magic_shield', description: 'Mage conjures a faint arcane glow that holds the worst of the darkness back.' },
        cleric: { type: 'divine_ward', description: 'Holy radiance pushes the darkness away entirely. The torch burns bright.' }
      }
    },

    tremor: {
      id: 'tremor',
      type: 'environmental',
      name: 'Tremor',
      triggerType: 'random_step',
      descriptions: [
        "The floor shakes. Dust rains from the ceiling. Somewhere deep below, something massive has shifted.",
        "A tremor rolls through the dungeon like a wave. Loose stones clatter and torches gutter in their sconces.",
        "The earth growls. The walls tremble. A crack races along the floor and stops at your feet."
      ],
      check: { ability: 'dex', dc: 11 },
      success: {
        texts: [
          "You ride out the shaking with your arms spread for balance. When it passes, you notice something \u2014 a section of wall has shifted, revealing a gap.",
          "The tremor throws loose stones, but none find you. In its wake, you spot a crack in the wall that wasn't there before.",
          "You keep your footing. As the dust settles, the outline of a hidden passage becomes visible where the wall has split."
        ],
        effect: { secret_revealed: true }
      },
      failure: {
        texts: [
          "A loose stone strikes your head as the world shakes. Stars bloom behind your eyes.",
          "You stumble and fall hard as the floor bucks beneath you. Your knee takes the worst of it.",
          "The tremor catches you mid-step. You crash into the wall, biting your tongue."
        ],
        damage: { rolls: 1, dice: 4 },
        effect: { secret_revealed: true }
      },
      classBonus: {
        ranger: { type: 'auto_detect', description: 'Ranger feels the vibration early: "Brace yourself \u2014 now!"' },
        fighter: { type: 'reduced_damage', factor: 0, description: 'Fighter braces like a statue. The tremor barely registers.' },
        mage: { type: 'magic_shield', description: 'Mage levitates slightly, floating above the shaking floor.' },
        cleric: { type: 'divine_ward', description: 'Cleric\'s divine footing keeps them perfectly stable.' }
      }
    }
  };

  // ----------------------------------------------------------
  // DISCOVERY EVENTS
  // ----------------------------------------------------------

  var DISCOVERY_EVENTS = {
    hidden_cache: {
      id: 'hidden_cache',
      type: 'discovery',
      name: 'Hidden Cache',
      location: 'wall',
      descriptions: [
        "Behind a loose brick, your fingers find a hollow space. Inside: someone's emergency stash, forgotten by time.",
        "A section of mortar crumbles at your touch, revealing a niche carved into the wall. Something glints within.",
        "The stone moves. Behind it: a small cavity lined with oilcloth, protecting its contents from the damp."
      ],
      rewards: [
        { type: 'gold', amount: { min: 5, max: 25 }, description: 'A handful of tarnished coins' },
        { type: 'potion', items: COMMON_POTIONS, description: 'A small vial, still sealed' },
        { type: 'random_item', description: 'A wrapped bundle' }
      ]
    },

    ancient_shrine: {
      id: 'ancient_shrine',
      type: 'discovery',
      name: 'Ancient Shrine',
      location: 'alcove',
      descriptions: [
        "An alcove in the wall holds a small stone altar, covered in dust but still bearing faint carvings of a deity long forgotten.",
        "Candlelight could not have lasted this long, yet twin flames burn atop a miniature shrine, casting dancing shadows on offerings of bone and crystal.",
        "A shrine to some ancient power sits untouched in this alcove. The air around it feels different \u2014 heavier, charged with potential."
      ],
      check: { ability: 'wis', dc: 12 },
      touchEffects: {
        buffs: [
          { stat: 'maxHp', bonus: 5, duration: 'floor', description: '+5 max HP until you leave this floor' },
          { stat: 'ac', bonus: 1, duration: 'floor', description: '+1 AC until you leave this floor' },
          { stat: 'attackMod', bonus: 2, duration: 'floor', description: '+2 to attack rolls until you leave this floor' },
          { stat: 'torch', restore: 25, description: 'Your torch flares with renewed vigor (+25 torch)' }
        ],
        curses: [
          { stat: 'maxHp', penalty: -3, duration: 'floor', description: '-3 max HP until you leave this floor' },
          { stat: 'ac', penalty: -1, duration: 'floor', description: '-1 AC until you leave this floor' },
          { stat: 'dex', penalty: -2, duration: 'floor', description: '-2 DEX until you leave this floor (heavy limbs)' }
        ]
      },
      classBonus: {
        cleric: { type: 'guaranteed_buff', description: 'The Cleric prays and the shrine responds with warmth and light. A guaranteed blessing.' }
      }
    },

    trapped_chest: {
      id: 'trapped_chest',
      type: 'discovery',
      name: 'Trapped Chest',
      location: 'dead_end',
      descriptions: [
        "A heavy iron chest sits in the corner of a dead-end room. Scratch marks on the floor suggest others have tried \u2014 and failed \u2014 to open it safely.",
        "The chest is ornate, which in a dungeon means one thing: trapped. The question isn't whether it's dangerous, but how dangerous.",
        "Dust has settled thickly on this chest, but the lock gleams as if polished daily. Something about it feels intentional."
      ],
      trapCheck: { ability: 'dex', dc: 14 },
      trapDamage: { rolls: 1, dice: 6 },
      trapText: {
        success: [
          "Your hands find the trip-wire and disarm it with a practiced twist. The chest opens safely.",
          "The needle was hidden in the lock mechanism. You extract it carefully and flip the lid open.",
          "A click \u2014 but you were ready. The spring-loaded blade snaps out into empty air where your fingers were a moment ago."
        ],
        failure: [
          "A needle jabs your finger as the lock turns. Fire races up your arm \u2014 poison.",
          "The chest bites back. A hidden blade slices your hand as you lift the lid.",
          "Something snaps inside the mechanism and you feel a sharp, burning pain. The trap has sprung."
        ]
      },
      classBonus: {
        ranger: { type: 'auto_disarm', description: 'Ranger spots and disarms the trap mechanism before touching the chest.' }
      },
      lootTable: [
        { type: 'weapon', chance: 0.2 },
        { type: 'potion_rare', chance: 0.3 },
        { type: 'gold_large', chance: 0.25 },
        { type: 'scroll', chance: 0.25 }
      ]
    },

    runic_puzzle: {
      id: 'runic_puzzle',
      type: 'discovery',
      name: 'Runic Puzzle',
      location: 'wall',
      descriptions: [
        "Glowing runes are carved into the wall in a circular pattern. They pulse slowly, as if breathing. The pattern seems to demand completion.",
        "A series of arcane symbols covers this section of wall, each one flickering with residual magical energy. They form a sequence with one rune missing.",
        "The wall here is covered in luminous script. Some of the runes have faded, but enough remain to suggest a puzzle \u2014 a test left by the builders."
      ],
      check: { ability: 'int', dc: 15 },
      success: {
        texts: [
          "The runes align under your touch. The wall hums, then speaks its secret \u2014 a spell combination, etched in light.",
          "The final rune slides into place. The entire wall blazes with golden light, and knowledge floods your mind.",
          "You trace the pattern to its completion. The runes sing a single note of pure clarity, and understanding follows."
        ],
        reward: 'spell_combo'
      },
      failure: {
        texts: [
          "The runes flash red. You've triggered the ward. A creature of bound energy tears itself from the wall.",
          "Wrong sequence. The puzzle rejects your answer with a burst of force that knocks you backward.",
          "The runes shatter one by one, and from the broken magic, something claws its way into existence."
        ],
        effect: { enemy_spawn: true, enemy_type: 'runic_guardian' }
      },
      classBonus: {
        mage: { type: 'bonus_check', bonus: 4, description: 'Mage recognizes the arcane notation: +4 to the Intelligence check.' }
      }
    },

    adventurer_remains: {
      id: 'adventurer_remains',
      type: 'discovery',
      name: "Adventurer's Remains",
      location: 'floor',
      descriptions: [
        "A skeleton in rusted armor slumps against the wall. One hand still clutches a journal; the other, a coin purse.",
        "The remains of a fallen adventurer lie in the corridor. Time has taken everything soft, but the gear remains.",
        "Bones and leather. A story ended mid-sentence. But the dead adventurer's belongings may extend yours."
      ],
      rewards: [
        { type: 'gold', amount: { min: 8, max: 30 }, description: 'A weathered coin purse' },
        { type: 'journal_page', description: 'A page from their journal, describing this floor\'s dangers' },
        { type: 'random_gear', description: 'Salvageable equipment' }
      ],
      journalEntries: [
        "Day 14. The creatures on this floor patrol in a pattern. Three rooms east, then south to the stairs. If you time it right, you can slip past.",
        "I found it \u2014 a shrine that heals. West corridor, second alcove from the stairs. Touch the stone and pray. It works. I don't know why.",
        "Note to self: the floor boss is vulnerable after its third attack. It pauses. That's your window. Don't waste it.",
        "The traps reset. I thought I was safe going back. I was wrong. TRAPS RESET. Write that on my tombstone.",
        "There's a false wall near the entrance. I could hear wind through the cracks. Never had the tools to open it.",
        "Water from the lower levels is poisoned. The moss growing near the stairs is edible but tastes of despair. Both keep you alive.",
        "If you're reading this and I'm dead: the key to the vault is in the room with two braziers. Don't touch the left one.",
        "The shadows move independently of the torchlight after midnight. I've tested this three times. They MOVE."
      ]
    }
  };

  // ----------------------------------------------------------
  // COMBAT MODIFIERS
  // ----------------------------------------------------------

  var COMBAT_MODIFIERS = {
    unholy_ground: {
      id: 'unholy_ground',
      name: 'Unholy Ground',
      description: 'This floor is tainted by dark energy. Undead creatures regenerate 2 HP per turn.',
      effect: { undead_regen: 2 },
      flavorText: "The stones underfoot are warm and slick. Something dead pulses beneath them.",
      counterClass: 'cleric'
    },
    echoing_halls: {
      id: 'echoing_halls',
      name: 'Echoing Halls',
      description: 'The acoustics amplify all sound. Sound-based attacks deal 50% more damage.',
      effect: { sound_damage_mult: 1.5 },
      flavorText: "Every footstep returns threefold. The dungeon has an echo that feels deliberate.",
      counterClass: null
    },
    arcane_interference: {
      id: 'arcane_interference',
      name: 'Arcane Interference',
      description: 'Wild magical energy saturates the air. All spell costs are doubled.',
      effect: { spell_cost_mult: 2.0 },
      flavorText: "The air crackles with stray energy. Your mana feels sluggish, resistant to shaping.",
      counterClass: 'mage'
    },
    narrow_passage: {
      id: 'narrow_passage',
      name: 'Narrow Passage',
      description: 'Tight corridors prevent flanking but enemies cannot surround you either.',
      effect: { no_flank: true, no_surround: true },
      flavorText: "The walls close in. There is room for only one to pass. Advantage: neither side can flank.",
      counterClass: 'fighter'
    },
    cursed_air: {
      id: 'cursed_air',
      name: 'Cursed Air',
      description: 'A foul miasma reduces healing effectiveness by 50%.',
      effect: { healing_mult: 0.5 },
      flavorText: "The air tastes of ash and rot. Healing magic sputters and fades before it can take hold.",
      counterClass: 'cleric'
    }
  };

  // ----------------------------------------------------------
  // TRAP SYSTEM
  // ----------------------------------------------------------

  var TRAPS = {
    pit_trap: {
      id: 'pit_trap',
      name: 'Pit Trap',
      description: 'A concealed pit yawns open beneath your feet.',
      detection: { ability: 'wis', dc: 12, rangerBonus: 'auto_2tiles' },
      disarm: { ability: 'dex', dc: 12 },
      damage: { rolls: 1, dice: 6 },
      effect: { fell: true },
      triggerTexts: [
        "The floor vanishes beneath you. For a sickening instant, there is only air.",
        "A trapdoor swings open with well-oiled precision. You drop into darkness.",
        "The flagstone was a lid. Gravity does the rest."
      ],
      detectTexts: [
        "You notice the mortar around this flagstone is different \u2014 newer. A trap.",
        "The dust pattern is wrong here. Something has been placed, not built.",
        "A faint draft rises from the floor. The stone ahead is hollow."
      ],
      disarmTexts: [
        "You wedge a stone into the mechanism. The pit trap is jammed open and harmless.",
        "Careful hands find the pivot point and lock it in place. Safe to cross.",
        "You trigger the trap from a safe distance with a thrown stone. It yawns open, then stalls."
      ],
      classBonus: {
        ranger: { type: 'auto_detect_2tiles', description: 'Ranger spots the pit trap from 2 tiles away.' },
        fighter: { type: 'half_damage', description: 'Fighter rolls with the fall, halving damage.' },
        mage: { type: 'detect_magic', description: 'Mage detects no magic \u2014 this trap is purely mechanical.' },
        cleric: { type: 'divine_ward_absorb', description: 'Cleric\'s divine ward absorbs the first trap hit this floor.' }
      }
    },

    dart_trap: {
      id: 'dart_trap',
      name: 'Dart Trap',
      description: 'Tiny holes in the wall spit poisoned needles.',
      detection: { ability: 'wis', dc: 13, rangerBonus: 'auto_2tiles' },
      disarm: { ability: 'dex', dc: 14 },
      damage: { rolls: 1, dice: 4 },
      effect: { poisoned: true, duration: 2 },
      triggerTexts: [
        "A hiss of compressed air and three darts punch into your arm. The tips glisten with something foul.",
        "Pin-pricks of fire dot your side as darts fly from hidden apertures in the stonework.",
        "You hear the click too late. Needles bite your skin, each one tipped with a burning toxin."
      ],
      detectTexts: [
        "Tiny holes, regularly spaced, line the wall at chest height. Your instincts scream: trap.",
        "A thin trip-wire catches the torchlight \u2014 barely visible, stretched ankle-high across the corridor.",
        "The wall here has a pattern of small openings. Too deliberate to be natural erosion."
      ],
      disarmTexts: [
        "You plug the dart holes with wax from your pack. Crude, but effective.",
        "The trip-wire parts cleanly under your knife. The mechanism clicks, fires, and the darts embed in the far wall.",
        "You trace the trigger mechanism and snap the spring that powers it. The darts fall harmless inside the wall."
      ],
      classBonus: {
        ranger: { type: 'auto_detect_2tiles', description: 'Ranger identifies the dart trap holes instantly.' },
        fighter: { type: 'half_damage', description: 'Fighter\'s armor absorbs most of the dart impact.' },
        mage: { type: 'detect_magic', description: 'Mage senses no arcane energy \u2014 mechanical trap.' },
        cleric: { type: 'divine_ward_absorb', description: 'Cleric\'s ward catches the darts in mid-flight.' }
      }
    },

    blade_trap: {
      id: 'blade_trap',
      name: 'Blade Trap',
      description: 'Blades sweep from wall slots, slicing at waist height.',
      detection: { ability: 'wis', dc: 11, torchBonus: true },
      disarm: { ability: 'str', dc: 13 },
      damage: { rolls: 1, dice: 8 },
      effect: { bleeding: true, duration: 2 },
      triggerTexts: [
        "Steel screams from the wall. A blade arcs across the corridor at waist height, impossibly fast.",
        "The slot in the wall was nearly invisible. The blade that emerges from it is not.",
        "A grinding noise, then a flash of steel. The trap blade sweeps through the air like a pendulum of death."
      ],
      detectTexts: [
        "Torchlight catches the edge of something metallic recessed in the wall. A blade, waiting.",
        "Scratch marks across the floor, wall to wall. Something sharp has been swinging here regularly.",
        "The wall slot is visible if you hold the torch close. Inside: a blade, spring-loaded and patient."
      ],
      disarmTexts: [
        "You jam your weapon into the slot, blocking the blade mechanism with brute force.",
        "The spring gives way under sustained pressure. The blade droops uselessly from its housing.",
        "You wrench the blade free of its mount entirely. It would make a decent weapon, actually."
      ],
      classBonus: {
        ranger: { type: 'auto_detect_2tiles', description: 'Ranger spots the wall slot from a distance.' },
        fighter: { type: 'half_damage', description: 'Fighter parries the blade, reducing damage.' },
        mage: { type: 'detect_magic', description: 'No magic here. The danger is entirely mechanical.' },
        cleric: { type: 'divine_ward_absorb', description: 'Divine energy catches the blade before it reaches flesh.' }
      }
    },

    magic_rune: {
      id: 'magic_rune',
      name: 'Arcane Rune Trap',
      description: 'A glyph of warding erupts with force energy when disturbed.',
      detection: { ability: 'int', dc: 14, mageBonus: 'glow_purple' },
      disarm: { ability: 'int', dc: 15 },
      damage: { rolls: 1, dice: 6 },
      effect: { knockback: true, tiles: 2 },
      triggerTexts: [
        "The rune beneath your foot blazes white-hot. A concussive blast hurls you backward through the air.",
        "Arcane energy detonates. You're lifted off your feet and thrown against the far wall.",
        "The glyph erupts. Pure force hammers your chest and sends you skidding across the stone floor."
      ],
      detectTexts: [
        "A faint purple glow emanates from the floor tile ahead. Arcane energy, contained and dangerous.",
        "Your arcane senses tingle. There is stored magic here \u2014 a ward, designed to punish the unwary.",
        "The rune is nearly invisible to the naked eye, but to one trained in the arcane arts, it pulses like a heartbeat."
      ],
      disarmTexts: [
        "You trace the counter-sigil in the air. The rune flickers, then dies \u2014 its energy safely dispersed.",
        "A whispered word of unbinding. The glyph's power unravels like thread from a spool.",
        "You identify the rune's anchor point and sever the magical connection with a precise gesture."
      ],
      classBonus: {
        ranger: { type: 'auto_detect_2tiles', description: 'Ranger senses something off about the floor ahead.' },
        fighter: { type: 'half_damage', description: 'Fighter endures the blast, holding ground against the knockback.' },
        mage: { type: 'detect_glow', description: 'Rune traps glow purple in the Mage\'s vision. Auto-detected.' },
        cleric: { type: 'divine_ward_absorb', description: 'The divine ward absorbs the rune\'s energy completely.' }
      }
    },

    bear_trap: {
      id: 'bear_trap',
      name: 'Bear Trap',
      description: 'Iron jaws snap shut on your leg, biting through leather and flesh.',
      detection: { ability: 'wis', dc: 10, rangerBonus: 'auto_detect' },
      disarm: { ability: 'str', dc: 10 },
      damage: { rolls: 1, dice: 4 },
      effect: { immobilized: true, duration: 1 },
      triggerTexts: [
        "SNAP. Iron teeth clamp onto your ankle. The pain is immediate and total.",
        "The bear trap was hidden under a thin layer of dust. Now it's hidden around your leg.",
        "A metallic crunch and a burst of white-hot agony. The jaws have you and they do not intend to let go."
      ],
      detectTexts: [
        "Ranger instinct: your eye catches the glint of iron teeth among the rubble. Bear trap.",
        "Something metallic gleams beneath the dust. You kneel and brush it away carefully \u2014 an iron jaw trap, set and waiting.",
        "The pressure plate's edge is just visible if you know what to look for. You do."
      ],
      disarmTexts: [
        "You pry the jaws apart with main strength. They resist, then yield with a grudging creak.",
        "One boot on each jaw, then push. The trap opens and you kick it aside.",
        "You wedge a stone between the teeth and the mechanism locks open. Safe."
      ],
      classBonus: {
        ranger: { type: 'auto_detect', description: 'Ranger auto-detects all bear traps.' },
        fighter: { type: 'half_damage', description: 'Fighter\'s greaves absorb most of the bite.' },
        mage: { type: 'detect_magic', description: 'No magic here. Pure mechanical cruelty.' },
        cleric: { type: 'divine_ward_absorb', description: 'The ward shatters the trap before it fully closes.' }
      }
    }
  };

  // ----------------------------------------------------------
  // EVENT ENGINE
  // ----------------------------------------------------------

  var events = {

    // ----------------------------------------------------------
    // generateFloorEvents: place all events for a floor
    // ----------------------------------------------------------
    generateFloorEvents: function(dungeonId, floor, seed) {
      var seedStr = 'events-' + String(dungeonId) + '-' + String(floor) + '-' + String(seed || '');
      var rng = mulberry32(seedHash(seedStr));
      var result = {
        environmental: [],
        discoveries: [],
        traps: [],
        combatModifiers: []
      };

      // Environmental events: 1-2 per floor
      var envCount = 1 + (rng() > 0.5 ? 1 : 0);
      var envKeys = Object.keys(ENVIRONMENTAL_EVENTS);
      var usedEnv = {};
      for (var e = 0; e < envCount; e++) {
        var envKey = pickSeeded(envKeys, rng);
        if (!usedEnv[envKey]) {
          usedEnv[envKey] = true;
          var envEvent = JSON.parse(JSON.stringify(ENVIRONMENTAL_EVENTS[envKey]));
          envEvent.position = { x: Math.floor(rng() * 12) + 1, y: Math.floor(rng() * 12) + 1 };
          envEvent.triggered = false;
          result.environmental.push(envEvent);
        }
      }

      // Discovery events: 2-3 per floor
      var discCount = 2 + (rng() > 0.6 ? 1 : 0);
      var discKeys = Object.keys(DISCOVERY_EVENTS);
      var usedDisc = {};
      for (var d = 0; d < discCount; d++) {
        var discKey = pickSeeded(discKeys, rng);
        if (!usedDisc[discKey]) {
          usedDisc[discKey] = true;
          var discEvent = JSON.parse(JSON.stringify(DISCOVERY_EVENTS[discKey]));
          discEvent.position = { x: Math.floor(rng() * 12) + 1, y: Math.floor(rng() * 12) + 1 };
          discEvent.discovered = false;
          result.discoveries.push(discEvent);
        }
      }

      // Traps: floor + 1 per floor
      var trapCount = floor + 1;
      var trapKeys = Object.keys(TRAPS);
      for (var t = 0; t < trapCount; t++) {
        var trapKey = pickSeeded(trapKeys, rng);
        var trap = JSON.parse(JSON.stringify(TRAPS[trapKey]));
        trap.position = { x: Math.floor(rng() * 12) + 1, y: Math.floor(rng() * 12) + 1 };
        trap.triggered = false;
        trap.detected = false;
        trap.disarmed = false;
        result.traps.push(trap);
      }

      // Combat modifiers: 0-1 per floor, deeper floors more likely
      var modChance = 0.1 + (floor * 0.15);
      if (rng() < modChance) {
        var modKeys = Object.keys(COMBAT_MODIFIERS);
        var modKey = pickSeeded(modKeys, rng);
        result.combatModifiers.push(JSON.parse(JSON.stringify(COMBAT_MODIFIERS[modKey])));
      }

      return result;
    },

    // ----------------------------------------------------------
    // triggerEvent: resolve an environmental or discovery event
    // ----------------------------------------------------------
    triggerEvent: function(eventData, player) {
      if (!eventData || eventData.triggered || eventData.discovered) {
        return { type: 'none', text: 'Nothing happens.' };
      }

      var result = {
        type: eventData.type,
        id: eventData.id,
        name: eventData.name,
        description: pickRandom(eventData.descriptions || [eventData.description || 'Something happens.']),
        check: null,
        success: null,
        failure: null,
        classBonus: null,
        outcome: null,
        rewards: [],
        effects: []
      };

      // Mark as triggered
      if (eventData.type === 'environmental') {
        eventData.triggered = true;
      } else if (eventData.type === 'discovery') {
        eventData.discovered = true;
      }

      // Apply class bonus detection
      var playerClass = (player && player.class) ? player.class.toLowerCase() : '';
      if (eventData.classBonus && eventData.classBonus[playerClass]) {
        result.classBonus = eventData.classBonus[playerClass];
      }

      // Environmental events: ability check
      if (eventData.type === 'environmental' && eventData.check) {
        var ability = eventData.check.ability;
        var dc = eventData.check.dc;
        var statVal = 10;
        if (player) {
          switch (ability) {
            case 'str': statVal = player.str || 10; break;
            case 'dex': statVal = player.dex || 10; break;
            case 'con': statVal = player.con || 10; break;
            case 'int': statVal = player.int || 10; break;
            case 'wis': statVal = player.wis || 10; break;
            case 'cha': statVal = player.cha || 10; break;
          }
        }

        var checkRoll = d20() + abilityMod(statVal);
        result.check = { ability: ability, dc: dc, roll: checkRoll, modifier: abilityMod(statVal) };

        if (checkRoll >= dc) {
          // Success
          result.outcome = 'success';
          result.success = {
            text: pickRandom(eventData.success.texts || [eventData.success.text || 'You succeed.']),
            effect: eventData.success.effect || {}
          };
          result.effects.push(eventData.success.effect || {});
        } else {
          // Failure
          result.outcome = 'failure';
          var dmg = 0;
          if (eventData.failure.damage) {
            dmg = rollDamage(eventData.failure.damage.rolls, eventData.failure.damage.dice);
          }
          // Class damage reduction
          if (result.classBonus && (result.classBonus.type === 'reduced_damage' || result.classBonus.type === 'half_damage')) {
            var factor = result.classBonus.factor !== undefined ? result.classBonus.factor : 0.5;
            dmg = Math.floor(dmg * factor);
          }
          if (result.classBonus && result.classBonus.type === 'divine_ward') {
            dmg = 0;
          }
          if (result.classBonus && result.classBonus.type === 'magic_shield') {
            dmg = Math.floor(dmg * 0.25);
          }

          result.failure = {
            text: pickRandom(eventData.failure.texts || [eventData.failure.text || 'You fail.']),
            damage: dmg,
            effect: eventData.failure.effect || {}
          };
          result.effects.push(eventData.failure.effect || {});
        }
      }

      // Discovery events: resolve rewards
      if (eventData.type === 'discovery') {
        result.outcome = 'discovered';
        if (eventData.id === 'ancient_shrine') {
          result = this._resolveShrineEvent(result, eventData, player);
        } else if (eventData.id === 'trapped_chest') {
          result = this._resolveTrappedChest(result, eventData, player);
        } else if (eventData.id === 'runic_puzzle') {
          result = this._resolveRunicPuzzle(result, eventData, player);
        } else if (eventData.id === 'adventurer_remains') {
          result = this._resolveRemains(result, eventData, player);
        } else if (eventData.id === 'hidden_cache') {
          result = this._resolveHiddenCache(result, eventData, player);
        }
      }

      return result;
    },

    // ----------------------------------------------------------
    // _resolveShrineEvent: touch shrine for buff or curse
    // ----------------------------------------------------------
    _resolveShrineEvent: function(result, eventData, player) {
      var playerClass = (player && player.class) ? player.class.toLowerCase() : '';
      var isCleric = playerClass === 'cleric';

      if (isCleric) {
        // Guaranteed buff
        var buff = pickRandom(eventData.touchEffects.buffs);
        result.rewards.push({ type: 'shrine_buff', buff: buff });
        result.effects.push({ type: 'buff', data: buff });
        result.description += "\n\nThe Cleric kneels and prays. The shrine responds with a pulse of golden warmth. " + buff.description + ".";
      } else {
        // 60% buff, 40% curse
        var wisCheck = d20() + abilityMod(player ? player.wis || 10 : 10);
        if (wisCheck >= (eventData.check ? eventData.check.dc : 12)) {
          var shrBuff = pickRandom(eventData.touchEffects.buffs);
          result.rewards.push({ type: 'shrine_buff', buff: shrBuff });
          result.effects.push({ type: 'buff', data: shrBuff });
          result.description += "\n\nThe shrine accepts your touch. Warmth spreads through your body. " + shrBuff.description + ".";
        } else {
          var curse = pickRandom(eventData.touchEffects.curses);
          result.rewards.push({ type: 'shrine_curse', curse: curse });
          result.effects.push({ type: 'curse', data: curse });
          result.description += "\n\nThe shrine rejects you. Cold radiates from the stone. " + curse.description + ".";
        }
      }

      return result;
    },

    // ----------------------------------------------------------
    // _resolveTrappedChest: disarm or take damage, get loot
    // ----------------------------------------------------------
    _resolveTrappedChest: function(result, eventData, player) {
      var playerClass = (player && player.class) ? player.class.toLowerCase() : '';

      if (playerClass === 'ranger') {
        // Auto-disarm
        result.description += "\n\nThe Ranger's trained eye finds the trap mechanism and disables it with practiced fingers. The chest opens safely.";
        result.effects.push({ type: 'trap_disarmed' });
      } else {
        var disarmRoll = d20() + abilityMod(player ? player.dex || 10 : 10);
        if (disarmRoll >= eventData.trapCheck.dc) {
          result.description += "\n\n" + pickRandom(eventData.trapText.success);
          result.effects.push({ type: 'trap_disarmed' });
        } else {
          var dmg = rollDamage(eventData.trapDamage.rolls, eventData.trapDamage.dice);
          if (playerClass === 'fighter') dmg = Math.floor(dmg * 0.5);
          result.description += "\n\n" + pickRandom(eventData.trapText.failure);
          result.effects.push({ type: 'trap_damage', damage: dmg });
        }
      }

      // Generate loot
      var lootRoll = Math.random();
      var loot;
      if (lootRoll < 0.3) {
        loot = pickRandom(RARE_POTIONS);
        result.description += "\n\nInside the chest: " + loot.name + ". " + loot.description + ".";
      } else if (lootRoll < 0.55) {
        var goldAmt = roll(30) + 10;
        loot = { type: 'gold', amount: goldAmt };
        result.description += "\n\nInside the chest: " + goldAmt + " gold coins, still gleaming.";
      } else if (lootRoll < 0.8) {
        loot = pickRandom(GOOD_TRADE_ITEMS);
        result.description += "\n\nInside the chest: " + loot.name + ". " + loot.description + ".";
      } else {
        loot = { type: 'scroll', name: 'Scroll of Protection', description: '+2 AC for the next combat encounter' };
        result.description += "\n\nInside the chest: a Scroll of Protection. +2 AC for the next combat.";
      }
      result.rewards.push({ type: 'chest_loot', item: loot });

      return result;
    },

    // ----------------------------------------------------------
    // _resolveRunicPuzzle: INT check for spell combo
    // ----------------------------------------------------------
    _resolveRunicPuzzle: function(result, eventData, player) {
      var playerClass = (player && player.class) ? player.class.toLowerCase() : '';
      var intStat = player ? player.int || 10 : 10;
      var bonus = 0;

      if (playerClass === 'mage' && eventData.classBonus && eventData.classBonus.mage) {
        bonus = eventData.classBonus.mage.bonus || 0;
        result.description += "\n\n" + eventData.classBonus.mage.description;
      }

      var checkRoll = d20() + abilityMod(intStat) + bonus;
      var dc = eventData.check ? eventData.check.dc : 15;

      if (checkRoll >= dc) {
        result.outcome = 'success';
        result.description += "\n\n" + pickRandom(eventData.success.texts);

        // Award a spell combo
        var combos = ['Fire+Wind', 'Ice+Stone', 'Light+Shadow', 'Fire+Stone', 'Wind+Ice', 'Shadow+Wind'];
        var combo = pickRandom(combos);
        var parts = combo.split('+');
        result.rewards.push({ type: 'spell_combo', combo: combo, elements: parts });
        result.description += " The combination of " + parts[0] + " and " + parts[1] + " is now seared into your memory.";
      } else {
        result.outcome = 'failure';
        result.description += "\n\n" + pickRandom(eventData.failure.texts);
        result.effects.push({ type: 'enemy_spawn', enemyType: eventData.failure.effect.enemy_type || 'runic_guardian' });
      }

      return result;
    },

    // ----------------------------------------------------------
    // _resolveRemains: loot the fallen adventurer
    // ----------------------------------------------------------
    _resolveRemains: function(result, eventData, player) {
      var goldAmt = roll(23) + 8;
      result.rewards.push({ type: 'gold', amount: goldAmt });
      result.description += "\n\nYou find " + goldAmt + " coins in the adventurer's purse.";

      // Journal page
      var entry = pickRandom(eventData.journalEntries);
      result.rewards.push({ type: 'journal_page', text: entry });
      result.description += "\n\nA page from their journal reads: \"" + entry + "\"";

      // Random gear
      var gearRoll = Math.random();
      if (gearRoll < 0.4) {
        var potion = pickRandom(COMMON_POTIONS);
        result.rewards.push({ type: 'item', item: potion });
        result.description += "\n\nAmong the remains: " + potion.name + ", miraculously intact.";
      } else if (gearRoll < 0.7) {
        result.rewards.push({ type: 'torch', amount: 15 });
        result.description += "\n\nA half-spent torch. Still usable. (+15 torch)";
      } else {
        var gear = pickRandom(MEDIOCRE_TRADE_ITEMS);
        result.rewards.push({ type: 'item', item: gear });
        result.description += "\n\nSalvageable equipment: " + gear.name + ".";
      }

      return result;
    },

    // ----------------------------------------------------------
    // _resolveHiddenCache: random loot behind a wall
    // ----------------------------------------------------------
    _resolveHiddenCache: function(result, eventData, player) {
      var rewardType = Math.random();
      if (rewardType < 0.4) {
        var goldAmt = roll(21) + 5;
        result.rewards.push({ type: 'gold', amount: goldAmt });
        result.description += "\n\n" + goldAmt + " tarnished coins, hidden from the world until now.";
      } else if (rewardType < 0.75) {
        var potion = pickRandom(COMMON_POTIONS);
        result.rewards.push({ type: 'item', item: potion });
        result.description += "\n\nA sealed vial of " + potion.name + ". Still potent.";
      } else {
        var scroll = { type: 'scroll', name: 'Scroll of Mapping', description: 'Reveals the current floor layout' };
        result.rewards.push({ type: 'item', item: scroll });
        result.description += "\n\nA Scroll of Mapping \u2014 unfurl it and the floor's layout appears in your mind.";
      }

      return result;
    },

    // ----------------------------------------------------------
    // checkTrap: detection + disarm check
    // ----------------------------------------------------------
    checkTrap: function(trapData, player) {
      if (!trapData || trapData.disarmed) {
        return { detected: false, triggered: false, text: 'No trap here.' };
      }

      var result = {
        trapId: trapData.id,
        trapName: trapData.name,
        detected: false,
        disarmed: false,
        triggered: false,
        damage: 0,
        effects: [],
        text: '',
        classBonus: null
      };

      var playerClass = (player && player.class) ? player.class.toLowerCase() : '';

      // Class-based auto-detection
      if (playerClass === 'ranger') {
        result.detected = true;
        trapData.detected = true;
        result.text = pickRandom(trapData.detectTexts || ['You spot the trap.']);
        if (trapData.classBonus && trapData.classBonus.ranger) {
          result.classBonus = trapData.classBonus.ranger;
        }
        return result;
      }

      if (playerClass === 'mage' && trapData.id === 'magic_rune') {
        result.detected = true;
        trapData.detected = true;
        result.text = pickRandom(trapData.detectTexts || ['The rune glows purple in your arcane sight.']);
        if (trapData.classBonus && trapData.classBonus.mage) {
          result.classBonus = trapData.classBonus.mage;
        }
        return result;
      }

      // Detection check for other classes
      if (!trapData.detected) {
        var detectAbility = trapData.detection.ability;
        var detectDC = trapData.detection.dc;
        var detectStat = 10;
        if (player) {
          switch (detectAbility) {
            case 'wis': detectStat = player.wis || 10; break;
            case 'int': detectStat = player.int || 10; break;
          }
        }

        // Blade trap: torch bonus
        var torchBonus = 0;
        if (trapData.detection.torchBonus && player && player.torch) {
          var torchPct = (player.torch / (player.maxTorch || 50)) * 100;
          if (torchPct > 50) torchBonus = 2;
        }

        var detectRoll = d20() + abilityMod(detectStat) + torchBonus;
        if (detectRoll >= detectDC) {
          result.detected = true;
          trapData.detected = true;
          result.text = pickRandom(trapData.detectTexts || ['You spot the trap.']);
          return result;
        }
      }

      // Trap triggered! Player walked into it.
      result.triggered = true;
      trapData.triggered = true;
      result.text = pickRandom(trapData.triggerTexts || ['A trap springs!']);

      var dmg = rollDamage(trapData.damage.rolls, trapData.damage.dice);

      // Class damage reduction
      if (playerClass === 'fighter') {
        dmg = Math.floor(dmg * 0.5);
        result.classBonus = trapData.classBonus ? trapData.classBonus.fighter : null;
      }

      // Cleric divine ward: absorb first trap per floor
      if (playerClass === 'cleric') {
        if (!player._clericWardUsed) {
          dmg = 0;
          player._clericWardUsed = true;
          result.classBonus = trapData.classBonus ? trapData.classBonus.cleric : null;
          result.text += ' ' + (result.classBonus ? result.classBonus.description : 'Divine ward absorbs the blow!');
        }
      }

      result.damage = dmg;
      if (trapData.effect) {
        result.effects.push(JSON.parse(JSON.stringify(trapData.effect)));
      }

      return result;
    },

    // ----------------------------------------------------------
    // disarmTrap: attempt to disarm a detected trap
    // ----------------------------------------------------------
    disarmTrap: function(trapData, player) {
      if (!trapData || trapData.disarmed || !trapData.detected) {
        return { success: false, text: 'Cannot disarm.' };
      }

      var playerClass = (player && player.class) ? player.class.toLowerCase() : '';

      // Ranger auto-disarm for mechanical traps
      if (playerClass === 'ranger' && trapData.id !== 'magic_rune') {
        trapData.disarmed = true;
        return {
          success: true,
          text: pickRandom(trapData.disarmTexts || ['Trap disarmed.']),
          classBonus: 'Ranger disarms with ease.'
        };
      }

      // Mage auto-disarm for magic runes
      if (playerClass === 'mage' && trapData.id === 'magic_rune') {
        trapData.disarmed = true;
        return {
          success: true,
          text: pickRandom(trapData.disarmTexts || ['Rune dispelled.']),
          classBonus: 'Mage dispels the arcane ward.'
        };
      }

      // Standard disarm check
      var disarmAbility = trapData.disarm.ability;
      var disarmDC = trapData.disarm.dc;
      var disarmStat = 10;
      if (player) {
        switch (disarmAbility) {
          case 'str': disarmStat = player.str || 10; break;
          case 'dex': disarmStat = player.dex || 10; break;
          case 'int': disarmStat = player.int || 10; break;
        }
      }

      var disarmRoll = d20() + abilityMod(disarmStat);
      if (disarmRoll >= disarmDC) {
        trapData.disarmed = true;
        return {
          success: true,
          text: pickRandom(trapData.disarmTexts || ['Trap disarmed.']),
          roll: disarmRoll,
          dc: disarmDC
        };
      } else {
        // Failed disarm triggers the trap
        trapData.triggered = true;
        var dmg = rollDamage(trapData.damage.rolls, trapData.damage.dice);
        if (playerClass === 'fighter') dmg = Math.floor(dmg * 0.5);

        return {
          success: false,
          text: 'Your attempt fails! ' + pickRandom(trapData.triggerTexts || ['The trap springs!']),
          roll: disarmRoll,
          dc: disarmDC,
          damage: dmg,
          effects: trapData.effect ? [JSON.parse(JSON.stringify(trapData.effect))] : []
        };
      }
    },

    // ----------------------------------------------------------
    // getEventDescription: get narrative text for any event
    // ----------------------------------------------------------
    getEventDescription: function(eventId, context) {
      // Check environmental events
      if (ENVIRONMENTAL_EVENTS[eventId]) {
        var env = ENVIRONMENTAL_EVENTS[eventId];
        return pickRandom(env.descriptions);
      }
      // Check discovery events
      if (DISCOVERY_EVENTS[eventId]) {
        var disc = DISCOVERY_EVENTS[eventId];
        return pickRandom(disc.descriptions);
      }
      // Check traps
      if (TRAPS[eventId]) {
        var trap = TRAPS[eventId];
        if (context === 'detect') return pickRandom(trap.detectTexts);
        if (context === 'disarm') return pickRandom(trap.disarmTexts);
        return pickRandom(trap.triggerTexts);
      }
      // Check combat modifiers
      if (COMBAT_MODIFIERS[eventId]) {
        return COMBAT_MODIFIERS[eventId].flavorText;
      }
      return 'The dungeon shifts around you.';
    },

    // ----------------------------------------------------------
    // getCombatModifiers: get active modifiers for this floor
    // ----------------------------------------------------------
    getCombatModifiers: function(dungeonId, floor, seed) {
      var floorEvents = this.generateFloorEvents(dungeonId, floor, seed);
      return floorEvents.combatModifiers;
    },

    // ----------------------------------------------------------
    // Data access for external systems
    // ----------------------------------------------------------
    getEnvironmentalEventData: function() { return ENVIRONMENTAL_EVENTS; },
    getDiscoveryEventData: function() { return DISCOVERY_EVENTS; },
    getTrapData: function() { return TRAPS; },
    getCombatModifierData: function() { return COMBAT_MODIFIERS; }
  };


  // ============================================================
  // EXPOSE GLOBALS
  // ============================================================

  window.DX_NPC = npc;
  window.DX_EVENTS = events;


  // ============================================================
  // INTEGRATION GUIDE
  // ============================================================
  //
  // Include this file AFTER dungeon-x-phase3.html script tag
  // or inline it before the Phaser game config.
  //
  // ---- NPC INTEGRATION ----
  //
  //   1. Floor Generation (in loadFloor or DungeonScene.create):
  //
  //      var meta = DX_SAVE.loadMeta();
  //      var npcEncounter = DX_NPC.generateEncounter(
  //        GAME.dungeonId, GAME.floor, GAME.dailySeed, meta
  //      );
  //      if (npcEncounter) {
  //        // Place NPC sprite at npcEncounter.position
  //        // Store npcEncounter on scene for later interaction
  //        this.currentNPC = npcEncounter;
  //      }
  //
  //   2. Player Interaction (when player is adjacent to NPC):
  //
  //      var meta = DX_SAVE.loadMeta();
  //      var result = DX_NPC.interact(
  //        this.currentNPC.type, PLAYER, meta
  //      );
  //      // result.dialogue  -> array of strings to display
  //      // result.rewards   -> array of { type, item/combo/hint }
  //      // result.effects   -> array of game effects to apply
  //      // result.success   -> boolean
  //
  //   3. Trickster Trade Resolution:
  //
  //      // After player selects an inventory item to trade:
  //      var dealResult = DX_NPC.resolveTricksterDeal(PLAYER);
  //      // dealResult.outcome  -> 'good', 'mediocre', or 'bad'
  //      // dealResult.item     -> item object or null (bad trade)
  //      // dealResult.dialogue -> narrative text
  //
  //   4. Applying Rewards:
  //
  //      for (var i = 0; i < result.rewards.length; i++) {
  //        var r = result.rewards[i];
  //        if (r.type === 'item')
  //          PLAYER.inventory.push(r.item);
  //        if (r.type === 'spell_combo')
  //          DX_SAVE.recordComboDiscovery(r.combo);
  //        if (r.type === 'gold')
  //          PLAYER.gold += r.amount;
  //      }
  //
  // ---- EVENT INTEGRATION ----
  //
  //   1. Floor Generation (in loadFloor):
  //
  //      var floorEvents = DX_EVENTS.generateFloorEvents(
  //        GAME.dungeonId, GAME.floor, GAME.dailySeed
  //      );
  //      // Store on scene:
  //      this.floorEvents = floorEvents;
  //
  //   2. Movement (in handleMove / step handler):
  //
  //      // Check for traps at player position:
  //      for (var t = 0; t < this.floorEvents.traps.length; t++) {
  //        var trap = this.floorEvents.traps[t];
  //        if (trap.position.x === PLAYER.x &&
  //            trap.position.y === PLAYER.y &&
  //            !trap.triggered && !trap.disarmed) {
  //          var trapResult = DX_EVENTS.checkTrap(trap, PLAYER);
  //          if (trapResult.detected) {
  //            // Show detection UI, allow disarm attempt
  //          } else if (trapResult.triggered) {
  //            PLAYER.hp -= trapResult.damage;
  //            // Apply trapResult.effects
  //          }
  //        }
  //      }
  //
  //      // Check for environmental events:
  //      for (var e = 0; e < this.floorEvents.environmental.length; e++) {
  //        var env = this.floorEvents.environmental[e];
  //        if (env.position.x === PLAYER.x &&
  //            env.position.y === PLAYER.y && !env.triggered) {
  //          var envResult = DX_EVENTS.triggerEvent(env, PLAYER);
  //          // Show envResult.description
  //          // Apply damage/effects from envResult
  //        }
  //      }
  //
  //   3. Search Action (when player searches a tile):
  //
  //      for (var d = 0; d < this.floorEvents.discoveries.length; d++) {
  //        var disc = this.floorEvents.discoveries[d];
  //        if (disc.position.x === PLAYER.x &&
  //            disc.position.y === PLAYER.y && !disc.discovered) {
  //          var discResult = DX_EVENTS.triggerEvent(disc, PLAYER);
  //          // Show discResult.description
  //          // Give discResult.rewards to player
  //        }
  //      }
  //
  //   4. Combat (apply active combat modifiers):
  //
  //      var mods = this.floorEvents.combatModifiers;
  //      for (var m = 0; m < mods.length; m++) {
  //        var mod = mods[m];
  //        // Show mod.flavorText on combat start
  //        // Apply mod.effect during combat:
  //        //   unholy_ground: enemy.hp += mod.effect.undead_regen per turn
  //        //   echoing_halls: sound attacks *= mod.effect.sound_damage_mult
  //        //   arcane_interference: spell costs *= mod.effect.spell_cost_mult
  //        //   narrow_passage: disable flanking mechanics
  //        //   cursed_air: healing *= mod.effect.healing_mult
  //      }
  //
  //   5. Trap Disarm (when player chooses to disarm detected trap):
  //
  //      var disarmResult = DX_EVENTS.disarmTrap(trap, PLAYER);
  //      if (disarmResult.success) {
  //        // Show disarmResult.text, remove trap indicator
  //      } else {
  //        PLAYER.hp -= disarmResult.damage;
  //        // Show disarmResult.text, apply effects
  //      }
  //
  //   6. Tremor Random Trigger (1 in 20 steps):
  //
  //      if (Math.random() < 0.05) {
  //        var tremor = JSON.parse(JSON.stringify(
  //          DX_EVENTS.getEnvironmentalEventData().tremor
  //        ));
  //        tremor.position = { x: PLAYER.x, y: PLAYER.y };
  //        var tremorResult = DX_EVENTS.triggerEvent(tremor, PLAYER);
  //        // Show screen shake, apply result
  //      }
  //
  // ---- SAVE INTEGRATION ----
  //
  //   NPC relationships are stored in meta.npcRelationships
  //   and persist across runs via DX_SAVE.saveMeta().
  //   The NPC system updates relationships automatically
  //   when DX_NPC.interact() is called.
  //
  //   Dead characters for ghost NPCs use meta.deadCharacters,
  //   populated by DX_SAVE.recordDeath().
  //

})();
