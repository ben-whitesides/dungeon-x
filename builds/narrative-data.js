(function() {
  'use strict';

  window.DX_NARRATIVE = {

    // ============================================================
    // 1. COMBAT NARRATOR TEXT — Darkest Dungeon Style
    // Voice: 30-year veteran DM. Literary modern English.
    // No thee/thou. Sensory-rich. Short for tension, long for atmosphere.
    // ============================================================
    COMBAT_NARRATOR: {

      // --- PLAYER MELEE ATTACKS ---
      melee_hit: [
        "Steel finds flesh. {damage} damage. The {enemy} staggers.",
        "A clean strike — the {enemy} recoils. {damage}.",
        "Your {weapon} bites deep. {damage} damage. The creature's howl echoes off stone.",
        "You press forward, blade singing. {damage}. The {enemy} will remember that.",
        "The blow lands true. {damage} damage. Dark blood on darker stone.",
        "A decisive cut. The {enemy} buckles but does not fall. {damage}.",
        "Steel meets shadow and wins. {damage} damage.",
        "Your arm knows the motion. Strike. Connect. {damage}. The {enemy} gives ground.",
        "The {weapon} catches torchlight and then catches flesh. {damage} damage.",
        "You step into the swing. The {enemy} absorbs the impact badly. {damage}."
      ],

      melee_miss: [
        "Your blade cuts air. The {enemy} was faster.",
        "A swing and nothing. The {enemy} sidesteps with animal grace.",
        "You overextend. The {enemy} is not where you expected.",
        "The strike goes wide. Stone chips where the {enemy} stood a heartbeat ago.",
        "Empty air. The {enemy} read your intent before you acted.",
        "Miss. The {enemy} watches with something that might be amusement.",
        "Your weapon finds only shadow. The {enemy} has moved.",
        "A clumsy swipe. Fatigue, perhaps. Or fear. Both lead to the same place.",
        "The {weapon} passes through empty space. The {enemy} is already elsewhere.",
        "You commit to the strike. The {enemy} does not commit to being there."
      ],

      melee_crit: [
        "CRITICAL. Your {weapon} finds the gap between armor and flesh. {damage} damage. The {enemy} screams.",
        "A perfect strike. The kind they write songs about. {damage} damage.",
        "The {weapon} moves as though it has its own will. {damage}. DEVASTATING.",
        "You feel the certainty before the blade lands. This one counts. {damage} damage. Critical hit.",
        "Every hour of training lives in this single stroke. {damage} damage. The {enemy} will not forget this.",
        "The opening was there for a heartbeat. You took it. {damage}. CRITICAL.",
        "Time slows. The {weapon} arcs. Contact. {damage} damage. Bones break.",
        "A blow that would make a weaponmaster weep with pride. {damage}. Critical.",
        "The {enemy}'s guard drops for one instant. One instant is all you need. {damage} damage. CRITICAL.",
        "Your {weapon} finds the seam in the creature's defenses and opens it like a letter. {damage}. Devastating."
      ],

      melee_fumble: [
        "Your foot catches on stone. The swing goes wild. The {enemy} sees opportunity.",
        "The {weapon} slips. A fumble. The kind that ends careers.",
        "Overcommitted. The {enemy} presses its advantage.",
        "A stumble. Your guard drops. The {enemy} does not hesitate.",
        "The {weapon} catches on your own armor. A rookie mistake in a veteran's fight.",
        "Gravity wins. You stumble. The {enemy} lunges.",
        "Your grip fails. The {weapon} twists in your hand. The {enemy} smells weakness.",
        "The floor is uneven. Your balance abandons you at the worst possible moment."
      ],

      // --- PLAYER TAKES DAMAGE ---
      player_hit: [
        "The {enemy} strikes true. {damage} damage. Pain flares bright and hot.",
        "A blow connects. {damage}. Your teeth rattle with the impact.",
        "{damage} damage. The {enemy}'s attack finds its mark. You taste copper.",
        "The hit drives you back a step. {damage}. You steady yourself.",
        "Pain. {damage} damage. The {enemy} is faster than it looks.",
        "The strike lands before you can react. {damage}. Adjust. Breathe. Fight.",
        "{damage} damage. The armor absorbs some of it. Not enough.",
        "The {enemy} draws blood. {damage}. The dungeon does not care.",
        "Your ribs remember that impact. {damage} damage. You will feel this tomorrow — if tomorrow comes.",
        "The {enemy}'s {attack} connects with the sound of a butcher's block. {damage}."
      ],

      player_dodge: [
        "You twist aside. The {enemy}'s strike whistles past your ear.",
        "Instinct saves you. The blow passes through empty space.",
        "You see it coming. Barely. The attack misses by a breath.",
        "The {enemy} lunges. You are no longer there.",
        "A narrow dodge. Your armor scrapes against stone as you roll clear.",
        "The {enemy}'s {attack} finds only shadow. You are learning its patterns.",
        "The air moves where your head was a moment ago. Close.",
        "You duck. The {enemy}'s strike passes overhead and sparks off the wall behind you."
      ],

      // --- SPELL CASTING ---
      spell_cast: [
        "The words leave your lips and the air changes. {spell}. {damage} damage.",
        "Arcane energy gathers, crackles, releases. {spell}. The {enemy} takes {damage}.",
        "You speak the incantation. The dungeon listens. {spell}. {damage} damage.",
        "Power flows through your fingers like water. {spell}. The {enemy} burns. {damage}.",
        "The spell forms perfectly. {spell}. {damage}. The air smells of lightning and old stone.",
        "You channel the weave. {spell} erupts. {damage} damage. The {enemy} reels.",
        "The formulae crystallize. Reality bends. {spell}. {damage} damage to the {enemy}.",
        "Your hands trace the sigil. The air obeys. {spell}. {damage}.",
        "Ancient words for a modern problem. {spell}. The {enemy} takes {damage} and staggers."
      ],

      // --- HEALING ---
      heal: [
        "Warmth floods through wounded flesh. +{amount} HP. The pain recedes.",
        "Divine light knits torn muscle and cracked bone. +{amount} HP.",
        "You feel the healing take hold. +{amount} HP. Not whole, but closer.",
        "The prayer is answered. +{amount} HP. The gods have not forgotten you.",
        "Restoration. +{amount} HP. Breathe. You are still here.",
        "Golden warmth where there was cold pain. +{amount} HP.",
        "The wound closes like a book. +{amount} HP. The story is not over yet.",
        "Light gathers in the wound and refuses to leave until the flesh remembers its shape. +{amount} HP."
      ],

      // --- ENEMY DEATH ---
      enemy_kill: [
        "The {enemy} falls. It does not rise. Silence returns to the corridor.",
        "A final shudder and the {enemy} is still. The dungeon claims another.",
        "The {enemy} crumbles. Whatever animates these things has released its grip.",
        "It is done. The {enemy} collapses like a puppet with severed strings.",
        "The last light fades from the {enemy}'s eyes. The fight is over.",
        "The {enemy} sinks to the stone. You are alive. It is not. Today, that is enough.",
        "Dust and silence. The {enemy} is no more.",
        "The creature falls. You step over it. The dungeon is deeper than one dead thing.",
        "The {enemy} folds in on itself. The corridor is yours. For now.",
        "A sound like old rope snapping. The {enemy} drops. The echo takes a long time to die."
      ],

      // --- PLAYER DEATH ---
      player_death: [
        "Darkness. Not the darkness of the dungeon. A deeper dark. A final one.",
        "You fall. The stone is cold. The torch gutters and dies. So do you.",
        "The last thing you see is the ceiling of a place that will forget you existed.",
        "It ends as it began — in darkness, in silence, in stone.",
        "Your vision narrows to a point of light. Then nothing.",
        "The {enemy} watches you fall with the patience of something that has seen this before.",
        "The stone receives you. It has received many. It will receive more.",
        "You had a name. The dungeon does not remember it. The dungeon does not remember any of them."
      ],

      // --- PARTY MEMBER DOWN ---
      ally_down: [
        "The {ally} falls. The party is diminished. The dungeon is not.",
        "{ally} drops. You hear the clatter of their weapon on stone.",
        "The {ally} crumbles. The fight continues whether you mourn or not.",
        "{ally} is down. The corridor feels colder.",
        "The {ally} hits the ground. The sound is worse than the sight.",
        "{ally} falls. You cannot help them yet. You cannot help them if you are dead."
      ],

      // --- FLEE ---
      flee_success: [
        "You run. There is no shame in it. The dead feel no pride.",
        "Retreat. The {enemy}'s howl fades behind you. You will remember it in your sleep.",
        "You choose survival over glory. A wise trade.",
        "The corridor swallows you. The {enemy} does not follow. It does not need to. It lives here.",
        "You turn your back on the fight. Your legs carry you. Your pride does not.",
        "Distance. Blessed, cowardly, life-preserving distance."
      ],

      flee_fail: [
        "You turn to flee. The {enemy} is faster.",
        "Escape denied. The {enemy} blocks the corridor. There is only forward.",
        "You stumble in your haste to flee. The {enemy} is upon you.",
        "No retreat. The dungeon decides who leaves and when.",
        "The corridor narrows behind you. The {enemy} fills it. Running is no longer an option.",
        "You cannot outrun what lives in these walls."
      ],

      // --- THROW ATTACKS ---
      throw_hit: [
        "The {weapon} tumbles through torchlight and finds its mark. {damage} damage.",
        "A throw born of desperation. It connects. {damage}.",
        "The {weapon} spins once and buries itself. {damage} damage. The {enemy} staggers.",
        "End over end through the dark. The {weapon} strikes true. {damage}."
      ],

      throw_miss: [
        "The {weapon} clatters against stone behind the {enemy}. Wasted.",
        "A poor throw. The {weapon} skitters into darkness. Recoverable, maybe. Later.",
        "The {enemy} ducks. Your {weapon} sails past and is gone.",
        "The throw goes wide. The {weapon} rings off the far wall like a bell nobody wanted."
      ],

      // --- ENVIRONMENTAL COMBAT ---
      env_door_crush: [
        "The portcullis drops. The sound is terrible — iron and bone and a scream cut short. {damage} damage.",
        "You release the gate. Gravity does the rest. {damage}. The {enemy} will not rise from beneath that."
      ],

      env_ceiling_collapse: [
        "The ceiling comes down. Stone and dust and screaming. {damage} damage to all. The corridor is changed forever.",
        "You called the stone down. It answered. {damage}. The rubble settles. Nothing moves."
      ],

      env_pit_push: [
        "You plant your feet and PUSH. The {enemy} stumbles backward into nothing. The fall is long. The landing is not.",
        "The {enemy} claws at air. The pit takes it. Some problems solve themselves."
      ],

      env_freeze_floor: [
        "Ice blooms across stone. The {enemy} steps and finds no purchase. Down it goes.",
        "The floor becomes a mirror of ice. The {enemy}'s feet betray it."
      ],

      // --- POTION USE ---
      potion_use: [
        "The liquid burns going down. +{amount} HP. It tastes like copper and regret, but it works.",
        "You drink. The potion does its work — stitching together what the dungeon tore apart. +{amount} HP.",
        "Warmth spreads from your stomach outward. +{amount} HP. One fewer potion. One more chance.",
        "The glass is empty before you taste it. +{amount} HP. Save the savoring for the tavern."
      ],

      // --- SHIELD BASH / SPECIAL ABILITIES ---
      shield_bash: [
        "Your shield connects with the sound of a cathedral door slamming. The {enemy} reels.",
        "Steel rim meets skull. The {enemy} staggers. A crude solution to a complicated problem.",
        "You drive the shield forward. The {enemy} had not considered that defense could be an attack."
      ],

      war_cry: [
        "You open your throat and the sound fills the corridor. Every enemy turns. You have their attention now.",
        "The war cry bounces off every wall. The {enemy} forgets the others. You are the only threat it sees.",
        "A sound older than language. Every creature in the room locks its gaze on you."
      ],

      snare_trigger: [
        "The trap bites shut. The {enemy} thrashes but the snare holds. It is going nowhere.",
        "A snap of wire and rope. The {enemy} is caught. It did not see the trap. That was the point."
      ],

      turn_undead: [
        "Holy light erupts from your hands. The undead recoil — not from pain, but from the memory of what they lost.",
        "The prayer strikes the undead like a physical blow. They remember they are supposed to be dead.",
        "Divine radiance fills the corridor. The {enemy} shrieks and retreats from the light."
      ]
    },

    // ============================================================
    // 2. NPC DIALOGUE SYSTEM — Hades model, state-mapped
    // Each NPC has 30+ unique lines across game states
    // ============================================================
    NPC_DIALOGUE: {

      // --------------------------------------------------------
      // ALDRIC GREAVES — The Barkeep
      // Warm but practical. Economy of words. Runs a business.
      // Missing two fingers. Went once. Does not talk about it.
      // --------------------------------------------------------
      aldric: {
        greeting: {
          first_visit: [
            "The Rusty Flagon. Ale is cheap. Rooms are not. I am Aldric. I keep the bar. I keep the peace. Those are the same job, most nights.",
            "New face. Good. The old ones keep dying. Sit anywhere that is not on fire. Ale is two copper. Water is free but it tastes like the pipe it came through.",
            "Welcome to the Flagon. I will give you the speech I give everyone: do not start fights in here, do not steal from the other patrons, and do not ask me about my fingers."
          ],
          fragments_0: [
            "Another day, another adventurer. The notice board has work if you want it. Most do not come back. That is not a warning. That is a statistic.",
            "You again. The ale has not changed. Neither has the dungeon. But the notice board has something new, if you are looking.",
            "Back so soon? I have been doing this long enough to know that look. You are about to do something inadvisable. Ale first?",
            "The regulars are talking about the crypts again. They always talk about the crypts. None of them go in. That is why they are regulars."
          ],
          fragments_1_2: [
            "Word travels. You found a fragment. The patrons are talking. I would tell you not to let it go to your head, but the ale will do that for me.",
            "One fragment. Most people stop there. The smart ones, anyway. The brave ones keep going. Brave and smart are not the same word, you will notice.",
            "Two fragments now. I have started keeping your mug behind the bar. That is either optimism or denial. I have not decided which.",
            "The cartographer — Mira — she has been asking about you. She draws faster when she is nervous. She is drawing very fast.",
            "You came back with a fragment and all your limbs. That puts you ahead of the last three who tried."
          ],
          fragments_3_4: [
            "Three fragments. I have been doing this for thirty years. I have seen two people find three. You are the third. The other two did not find four.",
            "Four. I stopped pretending this is normal around fragment three. Mira will not look at her own maps anymore. Elden has not touched his drink in a week. Well. He never does.",
            "The fire burns differently some nights. I blame the chimney. I do not believe it is the chimney.",
            "People come in here now just to see you. I should charge admission. I should also stop pouring your first ale, but I find that I cannot.",
            "Three fragments now, is it? I have started keeping your mug behind the bar. It seemed presumptuous at first. Now it seems prudent."
          ],
          fragments_5_6: [
            "Five fragments. Half the Sunstone. Even Elden has stopped calling it impossible. He just sits there and watches you with those dead eyes.",
            "Six. I opened a bottle I have been saving for twenty years. Not for celebration. For steadying my hands. Things are different now. The shadows in the corners of this room are longer than they should be.",
            "Half the Sunstone. The old stories say no one has held this many pieces since the Fracture. The old stories also say the man who broke it is still out there. Somewhere.",
            "I do not scare easily. I have run this bar through plague years and bandit seasons and one very unpleasant incident with a basilisk. But the way the fire flickers when you walk in now — that scares me.",
            "Five fragments. People are leaving Thornhaven. Not many. A few. They say the dreams started. I did not ask what dreams."
          ],
          fragments_7_8: [
            "Eight fragments. The fire burns blue some nights. I tell the patrons it is a draft. They do not believe me. I do not believe me.",
            "Seven. Mira has drawn the same map nine times this week. Each time, she tears it up. She says it keeps changing. I believe her.",
            "I am going to ask you one question. I have earned that, I think, after thirty years of pouring ale and minding my business. Do you know what you are doing? Because I have the distinct feeling that something is watching us through those fragments of yours. And it is not friendly.",
            "The regulars do not come anymore. The ones who do come sit with their backs to the wall and jump at the sound of the fire popping. Eight fragments. The world knows.",
            "Something spoke through the hearth last night. One word. I did not recognize the language. But I recognized the tone. It was patient."
          ],
          fragments_9: [
            "The last dungeon appeared on the board this morning. I did not post it. No one did. It was just there, written in a hand I have never seen.",
            "Nine fragments. One remains. I have thought about what to say to you at this moment for some time now. I have nothing clever. Come back alive. That is all I ask.",
            "The Final Descent. Aldenmere. A place that has been a story for three thousand years. Tomorrow it becomes real. I poured you a drink. On the house. It is the least I can do. It is the most I can do."
          ],
          after_death: [
            "Back from the dead. Again. Your tab survived even if you did not. Drink?",
            "You died. I know because the fire went cold for a moment. Welcome back. Try not to make it a habit.",
            "The stone sent you back. It does that. I do not pretend to understand why. Your mug is where you left it.",
            "Dead adventurers do not pay tabs. Living ones do. You owe me for three ales. Sit down.",
            "I watched the fire gutter. I knew. I poured your drink anyway. Call it faith."
          ],
          reputation_high: [
            "The Legendary one returns. Your usual is ready. I had to hire a second barmaid because of the crowd you draw. Do not let it go to your head.",
            "They sing about you now. In the street. Badly, but they sing. Your ale is on the house. I mean that — do not argue with me.",
            "You walk in and the whole room goes quiet. Then loud. I have seen a lot of adventurers. I have never seen that."
          ]
        },

        rumors: [
          "A fellow came through last winter. Thin man. Quiet hands. Said the water in the Vaults was warm. It should not be warm. He left heading east. He did not come back.",
          "The goblins in the Warrens have been quiet. That is worse than loud. Quiet goblins are planning something.",
          "Mira says the ice in the Frozen Abyss shifts. Not quickly, she says. But the corridors she mapped in autumn are not the corridors that exist now.",
          "There is a forge deep in the Shattered Halls. Three thousand years old and still running. Whatever powers it does not care about time.",
          "The Ember Depths — a sellsword told me the heat down there will kill you before the creatures do. Said the air itself is a weapon.",
          "The Crystal Sanctum does not want visitors. The doors there judge you. I am not being poetic. They literally judge you.",
          "I heard the Howling Spire opens to the sky at the top. Wind strong enough to push a man off the edge. Bring a rope."
        ],

        idle: [
          "The ale is not getting any younger. Neither am I. But it ages better.",
          "I keep the bar. I keep the peace. Today those are the same job.",
          "If you need supplies, Bessa is in her corner. She will charge you fairly. Not generously. Fairly.",
          "The fire is warm. Enjoy it. Where you are going, warmth is a luxury."
        ]
      },

      // --------------------------------------------------------
      // MIRA — The Cartographer
      // Precise and slightly anxious. Ink-stained. Draws obsessively.
      // Her maps show things that haven't happened yet.
      // --------------------------------------------------------
      mira: {
        greeting: {
          first_visit: [
            "Oh — you are new. I am Mira. Cartographer. I draw maps. That is what I do. That is all I do. Some of the maps are for sale, if you — I am sorry, is that ink on your shirt or is that mine? It is mine. It is always mine.",
            "A new adventurer. Good. I mean — good for business. Not good for you, necessarily. The survival rate is — actually, let me not say the number. Do you need a map? I have maps.",
            "Mira. Cartographer. I map the places people go to die. That sounds dramatic. It is accurate. Can I help you?"
          ],
          fragments_0: [
            "No fragments yet? That is fine. Most people never find any. Most people come back. Those two facts are related.",
            "The Crypts are well-mapped. I can sell you a partial layout — floor one, at least. Floor two... the measurements do not always agree with themselves. But it is mostly right.",
            "I have been charting the dungeons for six years. The walls do not move. I am fairly certain the walls do not move. They should not move."
          ],
          fragments_1_2: [
            "You found a fragment. That is — I do not know what that is. My hands are shaking. That is the ink. No, that is not the ink. I need to sit down.",
            "One fragment. I need to update my maps. The fragment changes things — the dungeon around it is different once the fragment is removed. I do not know why. I do not like not knowing why.",
            "Two fragments. I drew the second dungeon's layout last night from memory. I have never been inside it. I drew it anyway. It was accurate. I checked. I checked three times.",
            "The maps are changing. Not the dungeons — the maps themselves. I drew the Crypts last week. This morning the ink had shifted. A new corridor that was not there before. I am — I need more ink.",
            "Two fragments and you are still alive. The statistical anomaly of that is — I calculated it. I wish I had not."
          ],
          fragments_3_4: [
            "Three. I wake up drawing. I mean that literally. I fall asleep at my desk and when I wake up there are maps I did not draw. In my handwriting. Of places I have never seen.",
            "I mapped Dungeon Four last night. In my sleep. The layout was correct — I asked a survivor. He went pale when I showed him. He said I had drawn the room where he lost his partner.",
            "Four fragments. The maps are drawing themselves now. I just hold the pen and my hand moves. It is my hand. I think it is my hand.",
            "I do not want to alarm you. But the map of Dungeon Five appeared on my desk this morning in a language I do not speak. I translated it anyway. I did not know I could do that."
          ],
          fragments_5_6: [
            "Five fragments. Half. I can feel the other half. Not the dungeons — the fragments themselves. They hum at a frequency just below hearing. My teeth ache.",
            "Six. I drew Aldenmere last night. The city that has not existed for three thousand years. Every street. Every building. Every crack in the cobblestone. I have never been there. No one alive has been there.",
            "The maps are complete. All ten dungeons. I drew them all. I do not know how. I do not know why. But they are accurate — every adventurer who has checked has confirmed it."
          ],
          fragments_7_8: [
            "Seven — I can feel him. Through the maps. He is in the lines. Dorevus. He is in the ink. I know that sounds — I know how that sounds.",
            "I have not slept in four days. Every time I close my eyes I see the layout of the final dungeon. It keeps adding floors.",
            "Eight. I drew your face last night. On a map of the last dungeon. You were standing in a room I have not mapped yet. You were alone.",
            "My maps of the Crystal Sanctum are wrong. They keep changing. The doors move. The judgment thresholds shift. It is alive. It is adjusting."
          ],
          fragments_9: [
            "Nine. I drew the map of Aldenmere one final time. This time it was not a ruin. It was whole. The way it was before the Fracture. Someone is remembering it very hard.",
            "Take my maps. All of them. I do not need them anymore. The final dungeon is burned into my mind. I will see it until I die. Take them. Please. I need them out of my hands."
          ]
        },

        maps_for_sale: [
          "I can offer you a partial map of the first floor. Fifty gold. The second floor — I should charge more for that one. The measurements argue with themselves.",
          "This map is accurate as of last week. The dungeon may have changed. The dungeon should not change. But it does.",
          "I mark trap locations in red. Enemy patrol routes in blue. Loot rooms in gold. Inaccuracies in — well, I try not to have those."
        ],

        idle: [
          "The ink shifts sometimes. I am sure it is the humidity.",
          "I need to recalibrate the eastern corridor. The angles are wrong by two degrees. Two degrees matters when you are underground.",
          "Do not touch the maps on the table. They are still drying. Also, one of them may not be finished deciding what it wants to show.",
          "If you find my measurements wrong, tell me. Not because I want to know — because the dungeon wants me to know."
        ]
      },

      // --------------------------------------------------------
      // ELDEN — The Ghost at Table Seven
      // Ancient scholar. Dead 300 years. Empty tankard.
      // Measured wisdom. Knows more than he says.
      // --------------------------------------------------------
      elden: {
        greeting: {
          first_appearance: [
            "You notice me. Most do not. Or most choose not to. I am Elden. I have been sitting at this table for a very long time. The ale never runs out. The ale was never poured. Sit, if you like. I do not take up much space. I do not take up any space.",
            "Ah. You can see me. That usually takes longer. Perhaps the dungeon has sharpened your eyes already. I am Elden. I was an adventurer once. Now I am a feature of the furniture.",
            "Do not be alarmed. I am dead. I have been dead for quite some time. It gets easier. Or perhaps I simply stopped noticing. Either way — welcome. I have been waiting for someone worth talking to."
          ],
          fragments_0: [
            "You have not been inside yet. I can tell. Your hands are not shaking.",
            "The Crypts are patient. They have been waiting three thousand years. A few more hours will not trouble them.",
            "When I was alive, I went into the first dungeon with four companions. I am the only one who came back. I use the word 'came back' loosely."
          ],
          fragments_1_2: [
            "One fragment. You feel it, do you not? The warmth. It is not warmth. It is something pretending to be warmth. I found two, in my time. The third is what killed me.",
            "Two fragments. That is further than I went. Further than most go. The fragments sing when they are close to each other. You will hear it. It sounds almost beautiful.",
            "You carry fragments now. Be careful. The fragments are not objects. They are pieces of an awareness. Carrying them is not like carrying stones. It is like carrying eyes.",
            "I found three, once. Something came out of the walls after the third one. Something wearing my face. I died fighting myself. The irony was not lost on me."
          ],
          fragments_3_4: [
            "Three. The number that killed me. You have passed the point where my experience is useful. Beyond here, I can only watch.",
            "Four fragments. I can feel them from here. The table vibrates sometimes when you sit down. It has not done that in three hundred years.",
            "At four fragments, the dungeon begins to notice you specifically. Not the creatures — the dungeon itself. The walls remember your footsteps.",
            "You are collecting pieces of a consciousness. You understand that, yes? The Sunstone did not shatter into rocks. It shattered into pieces of Dorevus."
          ],
          fragments_5_6: [
            "Five. Stone has a long memory. Every fragment you carry whispers to the others. I can hear them now. I could not before. Something is changing.",
            "Six fragments. The balance has shifted. There are more pieces of the Sunstone in your possession than remain in the dungeons. Whatever Dorevus is — he is more with you than without you now.",
            "I have watched adventurers come and go for three centuries. None of them reached six. You are in uncharted territory. I mean that literally. Mira's maps will not save you."
          ],
          fragments_7_8: [
            "Seven. Something watches through the stones now. I can feel it pressing against the walls of this tavern. The hearth fire knows. It burns differently.",
            "Eight. I am afraid. I should not be able to feel fear — I am dead. But the fragments in your pack make me feel things I have not felt since I was alive. That is not a comfort.",
            "Dorevus was not always what he is now. He was a scholar. Like me. He wanted to understand death. I wanted to understand the dungeons. We both found more than we bargained for.",
            "Eight fragments. He can see through them. He can see this tavern. He can see me. He always could, I think. He just did not care until now."
          ],
          fragments_9: [
            "Nine. One remains. He has it. You know that. He is standing in front of it, at the center of Aldenmere, in a circle of absolute darkness, and he is waiting. He has waited three thousand years. He can wait one more day.",
            "Do not come back here. I mean that as a kindness. If you walk into Aldenmere with nine fragments, you will either save the world or end it. Neither outcome leaves room for tavern visits.",
            "I will be here when it is over. One way or another. The dead do not leave. That is rather the point."
          ]
        },

        after_player_death: [
          "That is the third time I have watched someone die to the {enemy}. Same way each time. There is a pattern. Find it.",
          "Death. I remember it. It is not as bad as the anticipation. You are back. That is what matters. The dungeon sent you back, which means the dungeon is not finished with you.",
          "You died. The stone received you and returned you. It does not do that for everyone. It did not do it for me.",
          "The dying is not the lesson. The lesson is what you saw just before the dying. Remember that.",
          "I watched you fall. I watched the light go out. I watched it come back. The fragments brought you back. They need you. That should concern you.",
          "Back again. Good. I was not done talking."
        ],

        lore_hints: [
          "The Aureate Circle did not build the dungeons. They sealed things inside them. The dungeons were already there. Older than the Circle. Older than the Sunstone itself.",
          "Dorevus was the thirteenth member of the Circle. They say twelve died in the Fracture. They never mention the thirteenth.",
          "The Sunstone did not power a city. It held the world together. Without it, the seams show. The dungeons are the seams.",
          "When all ten fragments are assembled, the Sunstone can be reforged. But the man who broke it is inside it. Reforming the stone reforms him. There is no version of this that does not involve meeting Dorevus."
        ],

        idle: [
          "I have been sitting at this table for three hundred years. The view has not changed. The ale has not changed. I have not changed. Everything else has.",
          "Do not mind me. I am mostly here. Mostly.",
          "Stone has a long memory. Longer than mine. And mine is three centuries.",
          "The fire flickers when I am thinking. Aldric blames the draft. The draft knows better."
        ]
      },

      // --------------------------------------------------------
      // ORIN VANE — The Wounded Sellsword
      // Boisterous surface, haunted underneath. Permanent limp.
      // Lost his sibling in Dungeon 2. PTSD beneath the bravado.
      // --------------------------------------------------------
      orin: {
        greeting: {
          first_visit: [
            "HA! Fresh meat for the grinder! I am joking. Mostly. Name is Orin. Orin Vane. Sellsword, retired. The limp is from the Warrens. The laugh is from the ale. Both are permanent.",
            "Another one! They just keep coming, do they not? I love it. I love the optimism. Sit down, sit down. I will tell you about the time I punched a goblin so hard its shaman felt it.",
            "Welcome, welcome. You look like you have never seen the inside of a dungeon. I look like I have seen too much of one. Between us, we have the right amount of experience."
          ],
          fragments_0: [
            "No fragments? Good. Smart. The fragments are trouble. I went looking for treasure, not fragments, and I came back with a limp and nightmares. Treasure is better. Treasure does not hum.",
            "The Crypts? I have been. Once. I did not enjoy it. The shadows move wrong in there. Not with the torchlight — against it. But you will be fine. Probably. Maybe. Drink?",
            "They say the Vault Warden guards the first fragment. Big skeleton. Ceremonial armor. Shield that eats fire. I fought it once. That is how I got the limp. And the scar. And the recurring dream."
          ],
          fragments_1_2: [
            "You found one! HA! Buy this adventurer a drink! No — I will buy them a drink. The first fragment is — it feels good, does it not? Warm. Like holding a promise.",
            "Two fragments. You are doing better than I did. I found zero. I found goblins. So many goblins. Little green nightmares with surprisingly good aim.",
            "One fragment and all your fingers? You are ahead of most. You are ahead of me. I started with ten and came back with ten, but Aldric was not so lucky.",
            "The fragments hum. Did you know that? Hold two of them close and they hum. A low sound, almost too quiet to hear. Like they are talking to each other. That is not comforting, if you think about it."
          ],
          fragments_3_4: [
            "Three fragments! I would say you are a legend, but legends are usually dead by now. Drink! Drink to being alive!",
            "Four fragments and you can still walk in here and sit down and drink ale. That is extraordinary. That is genuinely extraordinary.",
            "Did you find anything? In the dungeons. Anything that — anything that belonged to someone? A journal, maybe. Or a weapon with a name carved in the handle. Joren Vane. That is — that was my sibling's name.",
            "You have been to the Warrens. I can tell. You have the look. The one that says you have seen goblins up close and you wish you had not."
          ],
          fragments_5_6: [
            "Five! FIVE! I need more ale. I need — listen. When I went into the Warrens, I was brave. Stupidly brave. I kicked open doors. I laughed at goblins. Then I saw what was on the third floor and I stopped laughing. I have not laughed about dungeons since. Until now. Five fragments. That is something worth laughing about.",
            "Six fragments. You are not just an adventurer anymore. You are something else. I do not have a word for it. Aldric does not have a word for it. Even Elden does not have a word for it, and he has three hundred years of vocabulary.",
            "You remind me of Joren. Not in how you fight. In how you look when you come back. Like you left something behind and you know you have to go back for it."
          ],
          fragments_7_8: [
            "Seven fragments. I do not joke about this. I want to, but I cannot. Something has changed. The tavern feels different. The air tastes different. You are carrying something that was not meant to be carried.",
            "Eight. I am frightened for you. I am not good at being frightened for other people. I am good at punching things and drinking and telling stories. But this — this is bigger than punching.",
            "I dreamed about the Warrens last night. First time in years. Something was calling from the third floor. Something that sounded like Joren. But Joren is dead. Joren has been dead for years."
          ],
          fragments_9: [
            "Nine. You are going to Aldenmere. The place from the stories. The place I thought was a fairy tale told to sell maps. I — I want to give you something. It is not much. It is a dagger. It was Joren's. I found it on the first floor of the Warrens, in a pile of goblin scrap. They did not know what it was worth. I did.",
            "Come back. Do you hear me? I need you to come back. I cannot go in there with you. My leg will not allow it. My courage will not allow it. But I need someone to come back from a dungeon for once."
          ]
        },

        combat_tips: [
          "The Crypt Crawlers are slow. Fire finishes them fast. But the Shadow Lurkers — those you need to watch. They resist ice and they are faster than they look.",
          "The Bone Revenant on Floor Two hits like a collapsing wall. Sixteen armor class. Holy damage works. Fire does not — they already burned once.",
          "Goblins fight in packs. Kill the shaman first. Always kill the shaman first. The scrapper are annoying but the shaman is the one that makes you lose.",
          "The Vault Warden has a shield. Destroy the shield first or you are fighting a wall. Fire works on the shield. Then the real fight begins.",
          "The Frost Wraith — do not let it get close. Its touch is cold. Not winter-cold. Forgetting-cold. Like your muscles forget how to move."
        ],

        idle: [
          "I tell the good stories loud. The bad ones — I keep those quiet. You learn which is which after enough dungeons.",
          "This limp saved my life. I cannot go back in, so I am still alive. The dungeon gave me a limp and a lifetime. Fair trade.",
          "HA! Did I tell you about the goblin that threw a cooking pot at me? Twelve damage from a cooking pot. I still have the dent in my shield. And my skull.",
          "Some nights I wake up and I can hear goblin laughter. Then I remember I am in the tavern and the laughter is Aldric doing inventory. Similar sounds."
        ]
      },

      // --------------------------------------------------------
      // BESSA — The Fence / Merchant
      // Sharp, streetwise. Values competence, dismisses fools.
      // Pragmatic. Knows product quality. Fair, not generous.
      // --------------------------------------------------------
      bessa: {
        greeting: {
          first_visit: [
            "Browsing or buying? I do not do browsing. My time is worth money. Your time should be worth money. If it is not, fix that before you go underground.",
            "Bessa. Supplies. I will give you fair value. Not generous value. Fair. If you want generous, find a charity. If you want to survive, find me.",
            "New to the Flagon? I run the supply corner. Torches, potions, arrows, food. Everything costs what it costs. I do not negotiate. The dungeon does not negotiate either."
          ],
          fragments_0: [
            "No fragments. That means you are either new or cautious. New I can help. Cautious — you are already helping yourself. What do you need?",
            "I sell what keeps you alive. Torches because the dark is not your friend. Potions because the creatures are not your friend. Food because starvation is no way to die underground.",
            "Most adventurers buy too many weapons and not enough torches. The weapon you have is fine. The darkness is what will kill you."
          ],
          fragments_1_2: [
            "One fragment and you are still shopping. Good. The ones who stop shopping are the ones who stop breathing.",
            "Two fragments. I will not raise my prices. That would be predatory. I will, however, suggest you buy more potions. The dungeons get harder and your body does not get tougher fast enough.",
            "A fragment-hunter. Business has been better since you started coming back alive. Other adventurers see you and think they can do it too. They buy supplies. Most of them die. But they buy supplies first."
          ],
          fragments_3_4: [
            "Three. I have rare stock today. It costs more because it is rare. That is how rarity works.",
            "Four fragments and I am starting to take you seriously. I take very few people seriously. Buy something worthy of the compliment.",
            "You are my best customer. Not because you spend the most. Because you come back to spend more. Repeat business. That is what I respect.",
            "I acquired something you might want. I will not say where I acquired it. I will say it works."
          ],
          fragments_5_6: [
            "Five fragments. I have been holding something for someone worthy. I believe that person is you. It will cost you, but it is worth what it costs.",
            "Six. I do not give speeches. I sell goods. But if I were the speech-giving type, I would say this: whatever you are doing, do not stop. You are changing the mathematics of this place.",
            "Half the Sunstone. I have adjusted my inventory accordingly. You need better equipment now. I have better equipment. The prices reflect the quality."
          ],
          fragments_7_8: [
            "Seven. I have things you cannot buy anywhere else. I have things I should not have. You need them. I have them. That is the beginning and end of the negotiation.",
            "Eight fragments and I am selling you supplies that I do not fully understand. The smith in the back alley made this blade from metal he found near the dungeon entrance. It hums. I do not ask questions. I set prices.",
            "I do not frighten easily. But the things you need for where you are going — they frighten me. Not the items. The fact that they are necessary."
          ],
          fragments_9: [
            "Nine. This is everything I have. Take it. All of it. No — I am not being generous. I am being practical. If you fail, none of this inventory matters. If you succeed, I will rebuild. Either way, you need it more than I do.",
            "The last dungeon. I have prepared a kit. It contains everything I would bring if I were the kind of person who went underground. I am not. But you are. Take it."
          ]
        },

        shop_lines: [
          "Torches. Two copper each. Buy four. You think you need two. You need four.",
          "Health potions. Ten gold. They taste terrible. They work perfectly. Priorities.",
          "Iron keys. Fifteen gold. I do not ask where they were made and you should not ask where I got them.",
          "Arrows. One gold per five. Cheap because they break. Buy more than you think you need.",
          "That sword is serviceable. Not elegant. Not magic. It cuts things. Sometimes that is enough."
        ],

        appraisal: [
          "Let me see that. Hmm. The craftsmanship is adequate. I will give you fair value. Seven gold.",
          "Goblin-crafted. I can tell by the smell. Functional but crude. Five gold and I am being generous.",
          "This is Aureate work. Three thousand years old and still sharp. One hundred gold and I am underpaying.",
          "Cursed. I can tell by the way it sits in your hand — like it does not want to let go. I do not buy cursed goods. Get rid of it yourself."
        ],

        idle: [
          "I am not here to chat. I am here to sell. If you are not buying, move along. The inventory does not admire itself.",
          "Quality speaks for itself. So do I. Briefly.",
          "Every item in my corner has been tested. Not by me. By the people who sold it to me. Some of them are dead, but the products held up.",
          "I respect competence. Buy what you need, use it well, and come back for more. That is the only relationship I value."
        ]
      }
    },

    // ============================================================
    // 3. WALL MARKINGS & DUNGEON TEXT
    // Found on walls throughout all 10 dungeons
    // Types: warning, lore, hint, graffiti, dorevus
    // ============================================================
    WALL_MARKINGS: {
      whispering_crypts: {
        floor1: [
          { text: "THE CIRCLE SEALED THIS CHAMBER IN THE FOUR-HUNDREDTH YEAR. WHAT RESTS WITHIN WAS NOT MEANT TO REST.", type: "lore" },
          { text: "FIRE ALONE WILL NOT SAVE YOU HERE", type: "warning" },
          { text: "Heat and weight as one — the Aureate way. Fire and stone together.", type: "hint" },
          { text: "three went in. I came out. the other two are still walking down there. they are not alive. — Haral", type: "graffiti" },
          { text: "The murals show a golden age. The golden age shows its teeth if you look closely.", type: "lore" },
          { text: "DO NOT OPEN THE SARCOPHAGI. I opened the sarcophagi. I should not have opened the sarcophagi.", type: "graffiti" },
          { text: "The Vault Warden does not die. It waits.", type: "warning" },
          { text: "Something scratches at the stone from the other side. I can hear it when I press my ear to the wall. I wish I had not pressed my ear to the wall.", type: "graffiti" }
        ],
        floor2: [
          { text: "THE FRAGMENT OF DAWN WAS PLACED HERE BY THE CIRCLE. IT WAS NOT HIDDEN. IT WAS MOURNED.", type: "lore" },
          { text: "The Warden's shield consumes fire. But fire consumes the shield first. Strike fast.", type: "hint" },
          { text: "Joren Vane. Floor 3. He didn't make it out.", type: "graffiti" },
          { text: "the air is older down here. the stone remembers a time before the Circle. before the Sunstone. what was here before?", type: "graffiti" },
          { text: "THE FIRST LIGHT THAT EVER FELL ON THIS WORLD RESTS BEHIND THIS STONE", type: "lore" },
          { text: "The Warden knelt when the fragment was placed. It has been kneeling for three thousand years. Do not mistake patience for mercy.", type: "warning" }
        ]
      },

      goblin_warrens: {
        floor1: [
          { text: "HUMANZ GO HOME — signed, Gretchka", type: "graffiti" },
          { text: "The goblins built on top of older ruins. The stairs down do not match goblin architecture. Someone was here before them.", type: "lore" },
          { text: "Rope bridges. The goblins cut them when cornered. Cut them first.", type: "hint" },
          { text: "The Chief's Favorite is loud. Follow the sound. Or avoid it. Both are strategies.", type: "hint" },
          { text: "They stole everything in this room from adventurers. The swords. The shields. The bones. The goblins do not distinguish between loot and remains.", type: "lore" },
          { text: "KEEP OUT — WE FOUND IT FIRST — IT IS OURS — THE PRETTY ROCK IS OURS", type: "graffiti" },
          { text: "cooking fires mean goblins. cold fires mean the goblins left. or were taken.", type: "graffiti" }
        ],
        floor2: [
          { text: "Gretchka has dens. Three of them. Destroy the dens or she summons endlessly. The dens smell like old mushrooms.", type: "hint" },
          { text: "The Fragment of Dusk was cold when Gretchka found it. She wears it as a necklace. She does not know what it is. She knows it is important.", type: "lore" },
          { text: "The narrow slot in the wall — an arrow fits. Other classes: look for the grate. Or the tunnel.", type: "hint" },
          { text: "I came looking for my sibling. I found this instead. Whoever reads this — tell Orin I am sorry. — J.V.", type: "graffiti" },
          { text: "DOREVUS WAS HERE BEFORE THE GOBLINS. THE GOBLINS DO NOT KNOW THAT. THE WALLS DO.", type: "lore" }
        ]
      },

      flooded_vaults: {
        floor1: [
          { text: "The water is warm. It should not be warm. The fragment heats it. The fragment heats everything near it.", type: "lore" },
          { text: "HOLD YOUR BREATH. The submerged corridors are short. Your lungs are shorter. Twenty seconds.", type: "warning" },
          { text: "Three valves. Wrong order floods everything. Right order: read the instruction plate in the first room.", type: "hint" },
          { text: "the mimics look like chests. they do not look like mimics. that is the entire problem. trust your instincts. — a survivor", type: "graffiti" },
          { text: "Iron golems hate stone spells. They are made of what opposes them. The rust is your ally.", type: "hint" },
          { text: "The Drowned were people once. The water preserved their bodies but not their minds. What walks down here does not remember being human.", type: "lore" }
        ],
        floor2: [
          { text: "THE VAULT KEEPER WAKES WHEN THE WATER RISES. THE WATER ALWAYS RISES.", type: "warning" },
          { text: "Stone and Wind together create a sound the golems cannot withstand. Sonic Fracture. The scholars called it 'the key that fits all iron locks.'", type: "hint" },
          { text: "The Fragment of Storm crackles even underwater. The fish avoid it. So should anything made of metal.", type: "lore" },
          { text: "I sealed the vault. I sealed it from the inside. I did not plan to be on this side. — Keeper's Journal", type: "graffiti" }
        ]
      },

      ember_depths: {
        floor1: [
          { text: "The heat kills before the creatures do. Fire resistance is not optional here. It is arithmetic.", type: "warning" },
          { text: "Ember Hounds burn on death. Do not stand close when they fall.", type: "hint" },
          { text: "The Flame Salamanders maintain distance. Close the gap or die at range. Your choice.", type: "hint" },
          { text: "something lives in the lava. not in the caves. IN the lava. I saw it move.", type: "graffiti" }
        ],
        floor2: [
          { text: "The Furnace Warden is immune to fire. Ice creates steam — halved visibility, enemy confusion. Use it.", type: "hint" },
          { text: "The collapsed bridge can be crossed. Wind and stone create a column. Or throw a block. Or shoot a rope.", type: "hint" },
          { text: "The Fragment of Flame was not placed here. It landed here during the Fracture and set everything within a mile on fire. The fire has never gone out.", type: "lore" },
          { text: "THIS IS NOT A DUNGEON. THIS IS A FURNACE THAT FORGOT TO STOP.", type: "graffiti" }
        ],
        floor3: [
          { text: "IGNIS SLEEPS. DO NOT WAKE IGNIS. I WOKE IGNIS. I REGRET WAKING IGNIS.", type: "warning" },
          { text: "The wyrm opens lava vents when wounded. Wind and stone can seal them. Seal them or drown in fire.", type: "hint" },
          { text: "The first fire was not made by humans. This piece of the Sunstone remembers that. It remembers everything.", type: "lore" }
        ]
      },

      frozen_abyss: {
        floor1: [
          { text: "The ice is clear enough to see through. Not everything on the other side is dead. Not everything on the other side should be thawed.", type: "warning" },
          { text: "Spiked boots prevent sliding. The ice floor does not forgive bare feet. Or pride.", type: "hint" },
          { text: "Ice sprites are incorporeal. Half your physical attacks will pass through them. Magic works. Patience works better.", type: "hint" },
          { text: "the cold does not hate. it does not love. it simply waits. and it waits forever. — Cassius", type: "graffiti" }
        ],
        floor2: [
          { text: "A man in Aureate robes is frozen in the east wall. He has been there for three thousand years. He is not dead. Fire will thaw him. Whether you should is another question.", type: "lore" },
          { text: "The Glacial Bear freezes the floor with its body heat. It is too cold to be warm. That sentence makes sense here.", type: "hint" },
          { text: "Cassius Aldenmere. The last name. The last scholar. He chose the ice because the ice preserves. He chose correctly.", type: "lore" }
        ],
        floor3: [
          { text: "THE WARDEN OF THE ABYSS HAS BEEN HERE SINCE THE FRACTURE. IT DID NOT CHOOSE TO BE HERE. IT CHOSE TO STAY.", type: "lore" },
          { text: "Fire and Wind together create the Inferno Gust. It melts ice walls. It opens paths. It reminds the cold that fire was here first.", type: "hint" },
          { text: "The Fragment of Frost dropped the temperature of the vault by four degrees the moment the Ranger picked it up. It has been that cold ever since.", type: "lore" }
        ]
      },

      shattered_halls: {
        floor1: [
          { text: "Pull the lever. Something opens. Something else closes. Something you did not expect floods. Welcome to dwarven engineering.", type: "warning" },
          { text: "Gear Spiders use web. The web burns. Fire is the universal solvent in the Shattered Halls.", type: "hint" },
          { text: "the trolls regenerate. fire stops it. acid stops it. everything else is buying time.", type: "graffiti" },
          { text: "The dwarves built this place to last forever. Forever ended when the Sunstone cracked. But the machines keep running.", type: "lore" }
        ],
        floor2: [
          { text: "Six mechanisms. One sequence. The clues are on the walls if you know how to read them. Every class reads differently.", type: "hint" },
          { text: "Second-order effects. Every lever does two things. One you see. One you discover.", type: "warning" },
          { text: "The Forgemaster did not die. He fused. The line between engineer and engine blurred three thousand years ago. It has not cleared since.", type: "lore" }
        ],
        floor3: [
          { text: "THE FORGEMASTER'S LEGACY RUNS ON STEAM AND SPITE. DISABLE THE VALVES. THERE ARE FOUR.", type: "hint" },
          { text: "The Fragment of Stone is impossibly heavy. A Ranger could not lift it. A Mage solved the problem with Wind. Every problem has more than one door.", type: "lore" },
          { text: "I disabled three valves. I could not reach the fourth. The steam took my arm. If you are reading this with two arms, learn from my mistake. — Tormund", type: "graffiti" }
        ]
      },

      howling_spire: {
        floor1: [
          { text: "The tower goes up, not down. The wind goes sideways. Your arrows go wherever the wind decides.", type: "warning" },
          { text: "Moving against the wind costs double. Moving with it is free but takes you where it wants.", type: "hint" },
          { text: "The Storm Raptors dive from above. Watch the ceiling. The telegraph is one turn before impact.", type: "hint" }
        ],
        floor2: [
          { text: "Gargoyles. Stone immunity. Flying. Ranged attacks miss at distance. Get close. Survive the gaze.", type: "hint" },
          { text: "The tower was a wizard's home once. The upper floors are open to the sky now. Beauty and danger share the same address.", type: "lore" }
        ],
        floor3: [
          { text: "Three bells. Three tones. The sequence is written in musical notation on the north wall. Get it wrong and the gargoyles drop from the ceiling.", type: "hint" },
          { text: "Wind does not follow the same rules as the other elements. It was the first to leave the Sunstone and the last to slow down.", type: "lore" }
        ],
        floor4: [
          { text: "THE WIND'S VOICE IS NOT A CREATURE. IT IS MEMORY GIVEN SHAPE. THERE IS A CORE INSIDE THE TORNADO. FIND IT.", type: "hint" },
          { text: "Shadow and Light together — Reveal — shows the true form. Ice slows it. Physical attacks do nothing to wind.", type: "hint" }
        ]
      },

      void_chambers: {
        floor1: [
          { text: "Reality is a suggestion here. The walls shift. The floor lies. Trust your compass. Do not trust your eyes.", type: "warning" },
          { text: "Shadow creatures Phase between turns. Physical attacks miss during Phase. Spells connect. Time your strikes.", type: "hint" },
          { text: "the Shadow Clone mirrors your actions. it does what you did last turn. change your pattern or fight yourself forever.", type: "graffiti" }
        ],
        floor2: [
          { text: "The Null Hounds corrupt your map. Navigate by memory when the corruption hits. Two turns. That is all you need to survive.", type: "hint" },
          { text: "This place was a cult headquarters before it was a dungeon. The cult worshipped the space between things. They found it.", type: "lore" }
        ],
        floor3: [
          { text: "The Rift Walker cannot be dodged. It auto-hits. It can be stunned. Stun it or accept the damage.", type: "hint" },
          { text: "Shadow is not the absence of light. The Sunstone knew this. The cult that built this place knew it too. The fragment here is the proof.", type: "lore" }
        ],
        floor4: [
          { text: "THE ARCHIVIST ACHIEVED WHAT DOREVUS FAILED AT. PARTIAL TRANSCENDENCE. THE COST WAS EVERYTHING ELSE.", type: "lore" },
          { text: "Two mirrors. The key exists only as a reflection. Bring the real to manifest the reflection. Think before you act.", type: "hint" },
          { text: "Shadow and Light together — Reveal — forces the Archivist back into physical form. It hates being physical. Use that.", type: "hint" }
        ]
      },

      crystal_sanctum: {
        floor1: [
          { text: "The automata maintain order. They have maintained order for three thousand years. Do not disrupt order unless you are prepared for judgment.", type: "warning" },
          { text: "Judgment points accumulate. Loot costs 5. Attacking neutral automata costs 10. Breaking wards costs 15. At 25, they come for you.", type: "hint" },
          { text: "This place was built by the Circle to protect something. Not the fragment. Something older. Something the Circle built the fragment to contain.", type: "lore" },
          { text: "The Cleric feels at home here. The sanctum recognizes faith. Judgment accumulates slower for those who believe.", type: "hint" }
        ],
        floor2: [
          { text: "The Restored are former adventurers. Resurrected by the Sanctum's systems. They fight with your weapons. They do not remember their names.", type: "lore" },
          { text: "CHA reduces Judgment gain. Charm the system. Be worthy. Or be judged.", type: "hint" }
        ],
        floor3: [
          { text: "The Light Golems are vulnerable to Shadow. The irony is intentional. The Circle knew that balance requires opposition.", type: "hint" },
          { text: "The sacred geometry on the walls is not decorative. It is functional. Each pattern does something. Most of them hurt.", type: "warning" }
        ],
        floor4: [
          { text: "THE LAST ARCHIVIST WILL SPEAK BEFORE HE FIGHTS. HE WILL ASK THREE QUESTIONS. THE ANSWERS ARE IN EVERY DUNGEON YOU HAVE SURVIVED.", type: "hint" },
          { text: "He is not evil. He is tired. Three thousand years of guarding a piece of a broken god will do that.", type: "lore" },
          { text: "The Circle put the Fragment of Light here on purpose. This is where they thought the world would be safest. They were wrong. But they were close.", type: "lore" }
        ]
      },

      final_descent: {
        floor1: [
          { text: "Aldenmere. The name still echoes. The city still stands, partially. The darkness at its center has not moved in three thousand years. It does not need to move. It is already everywhere.", type: "lore" },
          { text: "The dungeon adapts to your class. Fighter: combat corridors. Mage: spell puzzles. Ranger: traps and navigation. Cleric: divine trials. It knows you.", type: "warning" },
          { text: "Echo Chambers activate every 15 turns. The dungeon learns your patterns. Vary your approach or fight your own habits.", type: "hint" }
        ],
        floor2: [
          { text: "The Unmoored are creatures Dorevus has touched. They split into copies. Only one is real. WIS save to identify it.", type: "hint" },
          { text: "The walls remember every adventurer who has walked these halls. Some of the echoes fight back.", type: "warning" }
        ],
        floor3: [
          { text: "Previous dungeon bosses return here. Enhanced. Changed. The Vault Warden with Shadow Phase. Gretchka with void summons. They remember you.", type: "warning" },
          { text: "You are not the first to reach this far. You may be the first to reach further.", type: "lore" }
        ],
        floor4: [
          { text: "The Forgemaster's Ghost and the Wind's Voice have merged. Incorporeal and elemental. Reveal to make physical. Then strike.", type: "hint" },
          { text: "Dorevus is on the next floor. He has been there for three thousand years. He is not hiding. He is not afraid. He is ready.", type: "lore" }
        ],
        floor5: [
          { text: "THE SUNSTONE SCAR. THIS IS WHERE IT HAPPENED. THIS IS WHERE IT ENDS. OR BEGINS. THE CHOICE IS YOURS.", type: "lore" },
          { text: "He will offer you a choice. He will mean it. Consider carefully what you want the world to be.", type: "warning" },
          { text: "The Scholar's Codex, if you have it, contains the original ritual. Use it here and end this with mercy instead of steel.", type: "hint" }
        ]
      }
    },

    // ============================================================
    // 4. EXPLORATION NARRATOR TEXT
    // Atmospheric descriptions for non-combat dungeon events
    // ============================================================
    EXPLORATION: {
      enter_room: {
        empty: [
          "The room is empty. Or appears to be. Appearances in this place are unreliable.",
          "Nothing moves. The air is stale. Something was here recently — you can smell it.",
          "Dust motes drift through the torchlight. The room has been waiting. It is no longer waiting.",
          "Silence. The particular silence of a place where noise has recently stopped.",
          "An empty room. The walls are bare. The floor is clean. Too clean. Something has been maintained here.",
          "The chamber opens before you. No enemies. No traps that you can see. But the dungeon does not give gifts.",
          "Nothing. Just stone and shadow and the echo of your breathing. That is enough, down here.",
          "The room exhales as you enter. A draft from somewhere deeper. Something stirred the air.",
          "Empty. The kind of empty that feels like something just left.",
          "Four walls. A floor. A ceiling. Nothing between them but your torch and your heartbeat."
        ],

        dark: [
          "Darkness ahead. Your torch reaches into it like a hand into cold water.",
          "The light stops at the threshold, as though afraid to enter.",
          "Beyond the doorway: nothing visible. The dark here has weight. You can feel it pressing against the torchlight.",
          "Your torch flickers at the entrance. The darkness inside is not empty. It is full of something that does not want to be seen.",
          "The room drinks your torchlight. Two steps in and you can barely see your own hand.",
          "Dark. Dense. The kind of darkness that makes you question whether you still have eyes.",
          "The shadows do not retreat from your torch. They negotiate."
        ],

        treasure: [
          "Gold catches torchlight. Something glints in the far corner. The dungeon is offering a reward. Or a bait.",
          "A chest. Intact. Untouched. In a dungeon where nothing remains untouched. Either it was placed here for you, or it was placed here for something that is not you.",
          "Treasure. The oldest trap in the world. But sometimes a chest is just a chest. The trick is knowing which time this is.",
          "Something valuable sits in the center of the room, lit by a shaft of light from above. It looks arranged. It looks intentional.",
          "A glint of metal in the dust. Then another. Gold coins, scattered like seeds. Someone left in a hurry.",
          "The room smells of old leather and tarnished metal. Someone stored their wealth here. Someone who did not return for it."
        ],

        trap: [
          "Something is wrong. The floor is too clean in one section. Too deliberate. Watch your step.",
          "A click. Beneath your foot. The kind of sound that makes experienced adventurers stop breathing.",
          "The stones here are uneven. Not from age. From design. Someone wanted the wrong step to be easy to take.",
          "Pressure plates. You can see the seams if you know what to look for. And now you know what to look for.",
          "The corridor narrows. The walls are scored with deep grooves at chest height. Something swings through here. Something sharp."
        ],

        enemy_nearby: [
          "A sound from ahead. Breathing that is not yours. Something lives in the next room, and it has heard you too.",
          "The torch flame bends sideways. Something ahead is displacing air. Something large.",
          "Scraping. Metal on stone. Slow and rhythmic. Whatever makes that sound has been doing it for a long time.",
          "The smell hits you first. Rot and copper and something older. Something is close.",
          "Your torch dims. Not from fuel — from proximity. Something ahead feeds on light.",
          "A shadow moves at the edge of your torchlight. Not a flicker. A shape. It is watching."
        ],

        boss_room: [
          "The corridor opens into a chamber larger than any room should be underground. The air hums. Something powerful has made this place its home.",
          "The room ahead is different. You can feel it in your bones — a vibration, a pressure change. This is where the guardian waits.",
          "A vast chamber. The torchlight does not reach the far wall. The ceiling is lost in darkness above. Whatever lives here has been here long enough to reshape the stone around it.",
          "The door ahead is different from the others. Larger. Older. Carved with warnings in a language that predates the walls that hold it."
        ],

        stairs_down: [
          "Stairs. Descending. The air that rises from below is colder and carries a sound just below hearing.",
          "The stairway spirals down into deeper dark. Each step is worn smooth by centuries of feet that walked down. Fewer walked back up.",
          "Deeper. The stone changes color as you descend. Darker. Older. The dungeon below this level was not built by the same hands."
        ],

        stairs_up: [
          "Stairs leading up. The air from above is warmer. Closer to the surface. Closer to something that resembles hope.",
          "Ascending. Each step feels lighter. Not because of the stone — because of the weight you are leaving behind you."
        ],

        locked_door: [
          "A door. Locked. The mechanism is old but sound. A key will open it. Or a spell. Or a Fighter with enough conviction.",
          "The door does not budge. It was locked with intention. Whatever is behind it was meant to stay behind it.",
          "Locked. The keyhole is clean — someone maintained this lock. Recently."
        ]
      },

      torch_warnings: {
        low: [
          "Your torch sputters. The shadows lean in.",
          "The flame is smaller now. The dark notices.",
          "Torchlight dims. The corridor stretches longer in the growing dark.",
          "The torch will not last much longer. The dark is patient. You should not be.",
          "Flickering. The shadows at the edge of your vision grow bolder."
        ],
        critical: [
          "The flame is a memory. Darkness is patient.",
          "Your torch coughs. One more breath of light. Maybe two. Then the dark inherits everything.",
          "Almost out. The things you cannot see can see you perfectly.",
          "The fire is dying. When it dies, you will learn what the dungeon sounds like without the distraction of sight."
        ],
        out: [
          "Darkness. Complete. The things in the dark have been waiting for this.",
          "The torch dies. The darkness does not rush in — it was already here. The light was the intruder.",
          "Black. Absolute. Your other senses sharpen — hearing, smell, touch. None of them bring comfort.",
          "The last ember winks out. You are blind. The dungeon is not."
        ]
      },

      food_water: {
        hungry: [
          "Your stomach reminds you that courage is not a meal.",
          "Hunger gnaws at the edges of your focus. The dungeon does not pause for lunch.",
          "A growl from your stomach. Not a creature. Somehow less dignified."
        ],
        starving: [
          "Hunger gnaws. Each step costs more than the last.",
          "Your body is consuming itself. Strength fades. The dungeon can wait. Your stomach cannot.",
          "Stars at the edge of your vision. Not real stars. The kind that mean your blood sugar is a memory."
        ],
        thirsty: [
          "Your throat is dry. The dungeon offers nothing to drink.",
          "Thirst. The constant companion of the unprepared. The walls are damp but you are not desperate enough. Yet.",
          "Water. You need water. The irony of dying of thirst underground is not lost on you."
        ],
        dehydrated: [
          "The world blurs at the edges. Water. You need water.",
          "Your tongue is sandpaper. Your thoughts are slow. Dehydration kills slower than a blade but just as thoroughly.",
          "Each breath is a rasp. The dungeon air is dry and your body has nothing left to give it."
        ]
      },

      discovery: {
        secret_door: [
          "A section of wall gives beneath your touch. Behind it — a passage that appears on no map.",
          "The stone here is different. Thinner. Hollow behind. Someone built this door to hide. It has been hiding for a long time.",
          "A click. A draft. A doorway that was not there a moment ago. The dungeon has more rooms than it shows to most."
        ],
        loot_found: [
          "Something glints in the rubble. Not gold — something older. Something left here by someone who expected to come back.",
          "A cache. Tucked into a crevice in the wall. Whoever hid this did so with care. They did not hide themselves with equal skill.",
          "Equipment. Battered but functional. Left behind by someone in too much of a hurry to carry it."
        ]
      }
    },

    // ============================================================
    // 5. DOREVUS PRESENCE SYSTEM
    // Escalating intrusions based on fragment count
    // ============================================================
    DOREVUS_PRESENCE: {
      wall_messages: {
        fragments_1_2: [
          "A scratching in unfamiliar handwriting: 'THE FIRST PIECE MOVES'",
          "Carved deep into stone that was smooth yesterday: 'I FELT THAT'",
          "Letters that glow faintly in the dark, visible only when the torch gutters: 'YOU FOUND ONE'",
          "In ash on the wall, written by a finger that left no prints: 'CONTINUE'"
        ],
        fragments_3_4: [
          "Words that were not here yesterday: 'YOU BEGIN TO UNDERSTAND'",
          "Carved in Aureate script that no living person should know: 'THREE THOUSAND YEARS I HAVE WAITED. WHAT IS ONE MORE DAY?'",
          "In the condensation on the wall, visible for a moment before it dries: 'I WAS A SCHOLAR ONCE'",
          "Scratched into the stone with desperate precision: 'THE CIRCLE LIED TO YOU. THEY LIED TO EVERYONE.'",
          "Written sideways on a support column: 'HALFWAY. YOU ARE HALFWAY TO UNDERSTANDING WHAT I UNDERSTOOD TOO LATE.'"
        ],
        fragments_5_6: [
          "Written in ash on the wall: 'YOU HAVE FIVE. I HAD THEM ALL.'",
          "In letters that bleed light: 'THE SUNSTONE WAS NOT A WEAPON. IT WAS A DOOR. I TRIED TO OPEN IT.'",
          "Carved so deep the stone around it has cracked: 'THEY CALLED ME PALE. THEY CALLED ME MAD. I WAS RIGHT ABOUT THE DOOR.'",
          "In a hand that trembles across the stone: 'DEATH IS NOT AN ENDING. IT IS A WALL. I NEARLY BROKE THROUGH.'",
          "Written in a spiral that tightens toward the center: 'DO YOU FEEL IT? THE FRAGMENTS CALLING? THAT IS MY VOICE. I AM INSIDE THEM.'"
        ],
        fragments_7_8: [
          "A voice in the combat log, between your own thoughts: 'CLOSER.'",
          "On every wall of the room, in every direction, one word: 'SOON'",
          "In handwriting that shifts between Aureate formal and desperate scrawl: 'I REMEMBER SUNLIGHT. I REMEMBER MY NAME. I REMEMBER WHAT THE CIRCLE REFUSED TO SEE.'",
          "Written and then partially erased, as though the writer reconsidered: 'I DID NOT MEAN TO BREAK IT. I MEANT TO OPEN IT. THERE IS A DIFFERENCE. THERE MUST BE A DIFFERENCE.'",
          "In letters that hum when you stand close: 'ASK ELDEN WHAT HE KNOWS. HE KNOWS MORE THAN HE TELLS. HE HAS ALWAYS KNOWN.'",
          "Carved into the floor beneath your feet: 'YOU ARE CARRYING PIECES OF ME. I CAN FEEL YOUR HEARTBEAT THROUGH THE STONE.'"
        ],
        fragments_9: [
          "The walls are covered. Every surface. One word repeated endlessly: 'REMEMBER'",
          "In letters ten feet tall, carved with impossible force: 'THE SCAR IS OPEN. THE CITY WAITS. I WAIT. COME.'",
          "Written in gold on black stone: 'I WAS DOREVUS THE PALE. I AM SOMETHING ELSE NOW. COME AND SEE WHAT I HAVE BECOME.'",
          "In a child's handwriting — delicate, careful, wrong: 'I DO NOT WANT TO BE ALONE ANYMORE. PLEASE.'",
          "The final message. Every wall. Every surface. Written in light: 'ONE REMAINS. IT IS IN MY HAND. COME AND TAKE IT. OR COME AND GIVE ME YOURS. EITHER WAY — COME.'"
        ]
      },

      combat_intrusions: {
        fragments_5_6: [
          "WATCHING",
          "CLOSER",
          "YES"
        ],
        fragments_7_8: [
          "CLOSER",
          "REMEMBER",
          "WRONG",
          "MINE",
          "LISTEN",
          "I SEE YOU",
          "THE DOOR"
        ],
        fragments_9: [
          "I WAS LIKE YOU",
          "THE CIRCLE LIED",
          "ASK ELDEN",
          "THE STONE REMEMBERS",
          "COME HOME",
          "ONE PIECE LEFT",
          "I AM NOT YOUR ENEMY",
          "I WAS RIGHT ABOUT DEATH"
        ]
      },

      tavern_intrusions: {
        fragments_7_8: [
          "The hearth fire burns blue for a heartbeat. No one comments. Everyone noticed.",
          "A word appears in the foam of your ale. You drink it before anyone else sees.",
          "The temperature in the tavern drops. Just for a moment. Just long enough to see your breath.",
          "A sound from the hearth. Not the fire popping. A voice. One word, too quiet to catch."
        ],
        fragments_9: [
          "Every candle in the tavern gutters at once. When they recover, a word is scratched into the bar top that was not there before: ALDENMERE.",
          "The trophy wall hums. The fragments you have placed there pulse in sequence. A heartbeat. His heartbeat.",
          "The ghost at Table Seven flickers. For one instant, he wears different robes. Aureate robes. Then he is himself again."
        ]
      }
    },

    // ============================================================
    // 6. CLASS-SPECIFIC ROOM DESCRIPTIONS (BG3 model)
    // What each class perceives in key dungeon locations
    // ============================================================
    CLASS_DESCRIPTIONS: {
      whispering_crypts: {
        entrance: {
          Fighter: "Stone walls scarred by blade marks. Someone fought here. Recently. The marks are chest-height — human, not creature. You check your grip on the {weapon}.",
          Ranger: "Tracks in the dust. Three sets entering. One set leaving. The single set was running. The dust has not settled on the deepest prints — perhaps a day old.",
          Mage: "The air hums with residual enchantment. The wards on these walls are old but not dead. Something is still being kept in. The arcane signatures overlap — multiple casters, centuries apart.",
          Cleric: "A chill that has nothing to do with temperature. The dead here are not at rest. You can feel them pressing against the veil. Your faith tightens in your chest like a fist."
        },
        vault_warden_room: {
          Fighter: "A broad chamber. Good footing. Room to swing. The skeleton in the center is enormous — its armor is ceremonial but the blade marks on the floor around it are not. Many have fought here. The skeleton is still standing.",
          Ranger: "Burn marks on the floor in a pattern — previous adventurers tried fire against the shield. Spent arrows litter the corners. This fight has been fought many times. The Warden has won every time so far.",
          Mage: "The shield glows with enchantment — old, layered, the kind that builds over centuries of ambient magical exposure. Fire vulnerability, but the shield will absorb the first several bolts. Break the shield's enchantment layer by layer.",
          Cleric: "The Warden is not undead in the traditional sense. It is consecrated — bound to this place by the Aureate Circle's own blessing. Turning it will not work. It believes it is righteous. It may be."
        },
        fragment_room: {
          Fighter: "A sarcophagus. Sealed. The mechanism is fire and stone — you can see the rune channels in the stone frame. The seal is old but strong. There may be another way through. The stone looks thin on the left side.",
          Ranger: "Scorch marks around the seal — others have tried. The successful marks are low and to the left, suggesting the fire must be applied at a specific angle. The stone itself has been weakened by centuries of heat attempts.",
          Mage: "The seal is Aureate spellwork. Fire and stone elements woven into a binary lock — both must be applied simultaneously. The magical resonance confirms this is where the Fragment of Dawn rests. The fragment's own energy is keeping the seal partially charged.",
          Cleric: "The sarcophagus radiates a warmth that is not heat. It is grace. Whatever rests inside was placed here with reverence, not fear. The Aureate Circle loved the thing they were sealing away. That changes the nature of this task."
        }
      },

      goblin_warrens: {
        entrance: {
          Fighter: "Low ceiling. Five feet, maybe less. You will need to crouch. Fighting bent is dangerous — your swings will be shortened. The goblins built for their own height. That was not stupidity. That was strategy.",
          Ranger: "Rope bridges ahead — improvised, but sound enough for a goblin's weight. The knots are recent. Well-tied. These goblins are smarter than the stories suggest. Tracks everywhere — dozens of them.",
          Mage: "Residual curse energy in the walls — a shaman has been working here. The magical traces are crude but effective. The curse aura will weaken your wards if you are not careful.",
          Cleric: "Life pulses through this place — chaotic, crude, but alive. The goblins have built a society here. Cooking fires. Sleep areas. Guard posts. This is not a lair. This is a home. You are the invader."
        }
      },

      flooded_vaults: {
        entrance: {
          Fighter: "Water at ankle depth and rising. The floor is slippery. Footing will be difficult — heavy armor is a liability in water. But heavy armor is the only thing between you and drowning slowly instead of quickly.",
          Ranger: "Waterline marks on the walls at three different heights — the water level changes. Recently. The highest mark is chest-height. Something controls the water flow. Find it before it finds you.",
          Mage: "The water conducts magical energy — you can feel your spells resonating through it. Lightning will be devastating here, but it will not discriminate between friend and enemy. Ice could freeze passage. Fire will create steam — useful for cover.",
          Cleric: "The consecrated dead rest uneasy in water. The Drowned are here — you can feel them beneath the surface. Not evil, precisely. Lost. They have forgotten they are dead. Your faith will remind them."
        }
      },

      ember_depths: {
        entrance: {
          Fighter: "The heat hits like a wall. Your armor absorbs it, holds it, and releases it back into your skin. Every step in plate mail is a step closer to collapse. Find shade. Find cooling. Or finish this quickly.",
          Ranger: "Heat shimmer distorts your vision. Ranging will be difficult — the air bends light. Your arrows will drift. Compensate for the thermal currents. And find fire-resistant cover. This place does not forgive exposure.",
          Mage: "The ambient fire energy is extraordinary. Your fire spells will cost less here — the element is eager. But ice spells will cost more, fighting against the environment. The heat is not natural. It is the fragment. The Fragment of Flame has been warming this place for three thousand years.",
          Cleric: "The heat is a test. Not in the poetic sense — in the literal sense. The Aureate Circle believed that fire purified. The Ember Depths are a crucible. Everything that enters is refined or destroyed."
        }
      },

      frozen_abyss: {
        entrance: {
          Fighter: "Ice on every surface. Your boots slip. Your gauntlets stick to the walls. The cold seeps through plate mail like it is not there. Fighting here means fighting the environment and the enemy simultaneously.",
          Ranger: "The ice is clear enough to see through. Movement on the other side — shapes, frozen mid-stride. Some are dead. Some are preserved. Look before you melt anything. Know what you are thawing.",
          Mage: "The magical resonance here is crystalline — perfect, structured, cold. Ice magic will be amplified. Fire magic will be resisted by the environment itself. The Fragment of Frost has turned this place into a conduit for cold. The walls are not walls. They are lenses.",
          Cleric: "Something holy was preserved here. The cold is not cruel — it is careful. It has kept something alive for three thousand years. Whether that something should be alive is a question your faith will need to answer."
        }
      },

      shattered_halls: {
        entrance: {
          Fighter: "Rubble everywhere. Collapsed beams. Cracked pillars. But between the wreckage — mechanisms. Gears the size of your shield, still turning. The dwarves built for permanence. The earthquake disagreed.",
          Ranger: "The trap density here is the highest you have seen. Every third tile has a trigger. The mechanisms are connected — pulling one lever cascades through the entire system. Step carefully. Touch nothing until you understand everything.",
          Mage: "Dwarven engineering and Aureate magic intertwined. The mechanisms run on enchantment — self-sustaining spell loops that have been operational for three millennia. Fascinating. And lethal. The distinction between fascinating and lethal is thinner here than anywhere else.",
          Cleric: "The dwarves who built this place worshipped precision. Every gear, every lever, every counterweight is a prayer in metal. When the Sunstone shattered, their prayer broke mid-word. The mechanisms still run because faith does not stop just because the god has gone silent."
        }
      }
    },

    // ============================================================
    // 7. LEVEL-UP AND MILESTONE TEXT
    // Class-specific celebrations and fragment discovery
    // ============================================================
    MILESTONES: {
      level_up: {
        Fighter: [
          "Your muscles remember what your mind forgot. You are stronger. +{hp} HP. Level {level}.",
          "The sword is lighter today. Or your arm is stronger. Does it matter? Level {level}.",
          "Your arms remember every blow you have struck and every blow you have taken. The weight has not changed — you have. Level {level}. +{hp} HP.",
          "Another level. Another scar that healed stronger than the skin it replaced. The dungeon is your teacher. The pain is your diploma. Level {level}."
        ],
        Ranger: [
          "Your eyes see further. Your arrows fly truer. The dungeon has taught you well. Level {level}. +{hp} HP.",
          "You move quieter now. The shadows do not notice you pass. Level {level}.",
          "Where others see darkness, you see information. The dungeon is a book and you are learning to read it. Level {level}. +{hp} HP.",
          "The tracks are clearer now. The traps are louder. The dungeon has not changed — your perception has. Level {level}."
        ],
        Mage: [
          "New formulae crystallize in your mind like frost on glass. Level {level}. +{mana} mana.",
          "The arcane responds to your will more readily. The boundary between thought and fire grows thinner. Level {level}.",
          "The elements answer faster now. Where once you coaxed fire from reluctant air, now it leaps to your fingers. Level {level}. +{mana} mana.",
          "Power accumulates. The Codex whispers of mages who lost themselves in pursuit of deeper mastery. You understand why. It is intoxicating. Be careful. Level {level}."
        ],
        Cleric: [
          "Your prayers are answered faster now. The divine ear bends closer. Level {level}. +{hp} HP.",
          "Faith deepens. The light in your hands burns brighter. +{hp} HP. +{mana} mana. Level {level}.",
          "Your faith is no longer a theory. You have tested it against shadow and bone and the cold mathematics of death, and it held. Level {level}.",
          "The divine does not shout. It speaks quietly, and you have learned to listen. The healing comes easier now. The light comes when called. Level {level}."
        ]
      },

      fragment_found: {
        1: "The Fragment of Dawn. It is warm to the touch. Warmer than stone should be. It pulses once, like a heartbeat, and then is still. You have begun something that cannot be undone.",
        2: "The Fragment of Dusk. It is cold where the first was warm. Twilight given form. When you hold both, they hum — a note almost too low to hear. They remember being whole.",
        3: "The Fragment of Storm. It crackles in your pack like a caged animal. Static lifts the hair on your arms. Three pieces now. The Sunstone is no longer a legend. It is inventory.",
        4: "The Fragment of Flame. It is warm enough to cook meat. Adventurers have tried. Do not. Four fragments. The weight of them is not physical. It is something else. Expectation, perhaps.",
        5: "The Fragment of Frost. The temperature drops four degrees the moment you touch it. Five fragments. Half the Sunstone. Wherever the other five rest, they know. You can feel the knowledge traveling through stone and time.",
        6: "The Fragment of Stone. Impossibly heavy for its size. The Sunstone was not delicate — it was bedrock given purpose. Six fragments. The tavern fire will burn differently tonight. Aldric will notice. He will not say anything.",
        7: "The Fragment of Wind. It rattles in your pack like something alive. The air around you moves differently now — a constant breeze from nowhere. Seven fragments. The world is beginning to notice what you are carrying. The world has opinions about it.",
        8: "The Fragment of Shadow. It casts a shadow in a different direction than you. You check twice. Three times. The shadow does not care about the light source. It points toward Aldenmere. Eight fragments. Something stirs at the edge of your awareness. A presence. Patient. Familiar. It has been watching for a long time.",
        9: "The Fragment of Light. The last fragment before the final one. It outshines every other piece in your pack. Mira's hands shook when she drew it on the map. Nine fragments. One remains. It is not hidden in a dungeon. It is held in a hand that has not let go in three thousand years. Dorevus has it. Dorevus is waiting. The Final Descent awaits.",
        10: "The Fragment of Life. Dorevus releases it — or you take it. Either way, all ten fragments pulse in unison. The Sunstone, scattered for three millennia across ten dungeons and a hundred thousand lives, remembers itself. The air changes. The stone changes. Everything changes. What happens next is the only choice that has ever mattered."
      },

      first_kill: "Your first kill. The creature is still. The torch still burns. You are still breathing. In the dungeon, that is victory. Everything else is detail.",

      first_death: "You die. The stone receives you. The stone returns you. You are at the Rusty Flagon. Aldric pours a drink without being asked. The dungeon did not kill you. It introduced itself.",

      first_dungeon_clear: "The dungeon is empty behind you. Everything that lived in it does not. You carry its fragment and its silence. The surface air tastes different now. Cleaner. Or maybe your lungs remember what breathing without fear feels like.",

      return_to_tavern: [
        "The Flagon. Warmth and noise and the smell of food. After the dungeon, it feels like a different country.",
        "Home. Or the closest thing to it. The tavern door opens and the world becomes bearable again.",
        "You step inside. The fire is lit. The ale is poured. For one moment, nothing is trying to kill you. Savor it."
      ]
    },

    // ============================================================
    // 8. AFFINITY SYSTEM TEXT
    // Party member interaction narration and bonded attacks
    // ============================================================
    AFFINITY: {
      trusted: {
        fighter_mage: "The Fighter positions himself between the Mage and danger without being asked. Some understandings require no words.",
        fighter_ranger: "The Fighter draws attention. The Ranger strikes from shadow. They have stopped planning it. It simply happens.",
        fighter_cleric: "The Fighter holds the line. The Cleric holds the Fighter together. A partnership built on mutual destruction and mutual repair.",
        mage_ranger: "The Mage calculates. The Ranger observes. Between them, nothing in the dungeon goes unnoticed or unexplained.",
        mage_cleric: "Arcane and divine. Science and faith. They argue about methodology and agree about results. The enemies do not care about the distinction.",
        ranger_cleric: "The Ranger's arrow flies. The Cleric's blessing follows it like a whisper. Precision meets grace."
      },

      strained: {
        fighter_mage: "The Fighter glances at the Mage. The Mage does not look back. The silence between them has weight.",
        fighter_ranger: "The Fighter charges. The Ranger holds back. They are fighting the same enemy from different philosophies. Neither is wrong. Both are frustrated.",
        fighter_cleric: "The Fighter takes damage that the Cleric could prevent. The Cleric heals wounds that the Fighter could avoid. Resentment builds in the spaces between gratitude.",
        mage_ranger: "The Mage speaks in theories. The Ranger speaks in tracks. They have stopped translating for each other.",
        mage_cleric: "The Mage questions everything. The Cleric questions nothing. In the middle ground where they might meet, there is only cold air.",
        ranger_cleric: "The Ranger trusts instinct. The Cleric trusts faith. Both are forms of belief. Neither will admit that."
      },

      bonded_attacks: {
        fighter_mage: {
          name: "Arcane Charge",
          desc: "The Fighter channels the Mage's spell through their weapon — a melee strike wreathed in arcane fire. Steel and sorcery, fused. The impact shakes the corridor."
        },
        ranger_cleric: {
          name: "Guided Arrow",
          desc: "The Cleric whispers a blessing. The Ranger's arrow turns in flight, finding the weakness no eye could see. Divine guidance meets mortal precision."
        },
        fighter_cleric: {
          name: "Holy Shield",
          desc: "Divine light flows through the Fighter's shield. For one moment, nothing in the dungeon can touch the party. A wall of faith made manifest."
        },
        mage_ranger: {
          name: "Precision Bolt",
          desc: "The Ranger marks the weak point. The Mage obliterates it. Science and sorcery in perfect concert. The target does not survive the collaboration."
        },
        fighter_ranger: {
          name: "Steel Rain",
          desc: "The Fighter hurls the Ranger skyward. At the apex, arrows fall like judgment. A maneuver that should not work. It works every time."
        },
        mage_cleric: {
          name: "Sacred Flame",
          desc: "Holy fire and arcane fire merge. The resulting inferno does not distinguish between the profane and the merely unfortunate. The corridor will remember this."
        }
      },

      affinity_change: {
        increased: [
          "Something shifts between {ally1} and {ally2}. A nod. A glance held half a second longer. Trust, built one battle at a time.",
          "{ally1} and {ally2} move in concert now. Not because they planned it. Because they no longer need to.",
          "The bond between {ally1} and {ally2} deepens. The dungeon tests partnerships. This one is passing."
        ],
        decreased: [
          "A tension between {ally1} and {ally2}. Unspoken. The kind that accumulates like dust and is just as difficult to clean.",
          "{ally1} and {ally2} stand further apart than they used to. The distance is not physical. It is professional.",
          "Something cold between {ally1} and {ally2}. Not hostility. Disappointment. Which is worse."
        ]
      }
    },

    // ============================================================
    // UTILITY: Narrator helper for random selection
    // ============================================================
    getLine: function(category, subcategory, replacements) {
      var lines;
      if (subcategory) {
        var parts = subcategory.split('.');
        lines = this[category];
        for (var i = 0; i < parts.length; i++) {
          if (lines) lines = lines[parts[i]];
        }
      } else {
        lines = this[category];
      }

      if (!lines) return '';
      if (typeof lines === 'string') {
        var result = lines;
        if (replacements) {
          for (var key in replacements) {
            result = result.replace(new RegExp('\\{' + key + '\\}', 'g'), replacements[key]);
          }
        }
        return result;
      }
      if (!Array.isArray(lines)) return '';

      var line = lines[Math.floor(Math.random() * lines.length)];
      if (replacements) {
        for (var key in replacements) {
          line = line.replace(new RegExp('\\{' + key + '\\}', 'g'), replacements[key]);
        }
      }
      return line;
    }
  };

})();
