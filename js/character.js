var leveledUp = false;

var character = {
    info: {
        name: '-',
        attributePoints: 10,
        class: '-',
        job: '-',
        level: 1,
        experience: 10,
        loot: 100,
        gold: 100,
        rarity: 100
    },
    stats: { // stats from skills and allocated points
        strength: 5,
        dexterity: 5,
        intelligence: 5,
        luck: 5,
        hp: 20,
        mp: 20,
        defense: 0,
        pierce: 0,
        evasion: 0,
        accuracy: 0
    },
    compoundedStats: { // values from stats combined with gear and any unaccounted multipliers
        strength: 5,
        dexterity: 5,
        intelligence: 5,
        luck: 5,
        hp: 20,
        mp: 20,
        defense: 0,
        pierce: 0,
        evasion: 0,
        accuracy: 0
    },
    equipment: {
        weapon: {
            type: 'intelligence'
        },
        helmet: {
            luck: 5,
            evasion: 3,
            luckPercent: 6
        },
        body: {
            mp: 10,
            luckPercent: 12
        }
    },
    gainExperience: function(amount) {
        if (amount > 0) {
            character.info.experience += amount;
            leveledUp = false;
            while (character.info.experience > experienceCurve[character.info.level]) {
                character.info.level += 1;
                character.info.attributePoints += 5;
                leveledUp = true;
            }
            if (leveledUp) {
                updateCharacterDisplay()
            }
        }
    }
    
};

const compoundedStatsToIterateThrough = Object.keys(character.compoundedStats);

const displayValuesToUpdate = ['name', 'attributePoints', 'class', 'job', 'level', 'loot', 'gold', 'rarity', 'strength', 'dexterity', 'intelligence', 'luck', 'hp', 'mp', 'defense', 'pierce', 'evasion', 'accuracy'];
function updateCharacterDisplay() {
    getCompoundedStats() // I think I'd always want to do this if I'm updating it anyways
    displayValuesToUpdate.forEach(updateOneCharacterDisplay)
    if (canAllocateAP) {
        $('.statButton').removeAttr('disabled');
    }
    else {
        $('.statButton').attr('disabled','disabled');
    }
}

var canAllocateAP = false;
function updateOneCharacterDisplay(subject) {
    if (subject in character.info) {
        value = character.info[subject];
        if (subject == 'attributePoints') {
            if (value > 0) {
                canAllocateAP = true;
            }
            else {
                canAllocateAP = false;
            }
        }
    }
    else {
        value = character.compoundedStats[subject];
    }
    if (typeof value == 'number') {
        $('#' + subject + 'Value').text(Math.round(value))
    }
    else {
        $('#' + subject + 'Value').text(value)
    }
}