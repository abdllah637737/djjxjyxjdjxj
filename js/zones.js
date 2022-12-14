MAX_MOBS = 30;
var zoneConnections = {
    1: [{l: 962, t: 630, dest: 2}],
    2: [{l: 38, t: 162, dest: 1}, {l: 600, t: 265, dest: 3}],
    3: [{l: 78, t: 162, dest: 2}, {l: 600, t: 265, dest: 4}],
    4: [{l: 78, t: 162, dest: 3}, {l: 600, t: 265, dest: 5}],
    5: [{l: 78, t: 162, dest: 4}, {l: 600, t: 265, dest: 6}],
    6: [{l: 78, t: 162, dest: 5}, {l: 600, t: 265, dest: 7}],
    7: [{l: 78, t: 162, dest: 6}, {l: 600, t: 265, dest: 8}],
    8: [{l: 78, t: 162, dest: 7}, {l: 600, t: 265, dest: 9}],
    9: [{l: 78, t: 162, dest: 8}, {l: 600, t: 265, dest: 10}],
    10: [{l: 78, t: 162, dest: 9}, {l: 600, t: 265, dest: 11}],
    11: [{l: 78, t: 162, dest: 10}, {l: 600, t: 265, dest: 12}],
    12: [{l: 78, t: 162, dest: 11}, {l: 600, t: 265, dest: 13}],
    13: [{l: 78, t: 162, dest: 12}, {l: 600, t: 265, dest: 14}],
    14: [{l: 78, t: 162, dest: 13}, {l: 600, t: 265, dest: 15}],
    15: [{l: 78, t: 162, dest: 14}, {l: 600, t: 265, dest: 16}],
    16: [{l: 78, t: 162, dest: 15}, {l: 600, t: 265, dest: 17}],
    17: [{l: 78, t: 162, dest: 16}, {l: 600, t: 265, dest: 18}],
    18: [{l: 78, t: 162, dest: 17}, {l: 600, t: 265, dest: 19}],
    19: [{l: 78, t: 162, dest: 18}, {l: 600, t: 265, dest: 20}],
    20: [{l: 78, t: 162, dest: 19}, {l: 600, t: 265, dest: 21}],
    21: [{l: 78, t: 162, dest: 20}, {l: 600, t: 265, dest: 22}],
    22: [{l: 78, t: 162, dest: 21}, {l: 600, t: 265, dest: 23}],
    23: [{l: 78, t: 162, dest: 22}, {l: 600, t: 265, dest: 24}],
    24: [{l: 78, t: 162, dest: 23}, {l: 600, t: 265, dest: 25}]
};

var zoneMobs = {
    1: ['tino'],
    2: ['potted sprout'],
    3: ['pig'],
    4: ['ghost stump'],
    5: ['mano'],
    6: ['orange mushroom'],
    7: ['water thief monster'],
    8: ['crying blue mushroom'],
    9: ['zombie mushroom'],
    10: ['mushmom'],
    11: ['stone golem'],
    12: ['yeti'],
    13: ['jr pepe'],
    14: ['royal guard pepe'],
    15: ['helmet pepe'],
    16: ['pepe'],
    17: ['white yeti and king pepe'],
    18: ['possibly-evil seal'],
    19: ['possibly-evil walrus'],
    20: ['warmer bot'],
    21: ['turnipy'],
    22: ['wraith'],
    23: ['dyle'],
    24: ['mutant ribbon pig']
};

var currentZone = 1;

var zonePlatforms = [
    [-120, 769, 1199, 769],
    [-120, 594, 227, 594],
    [264, 546, 818, 546],
    [-120, 298, 375, 298],
    [338, 398, 741, 398],
    [779, 398, 819, 398],
    [411, 251, 669, 251],
    [704, 298, 818, 298],
    [854, 350, 1199, 350]
];

function debugZonePlatforms() {
    let gameArea = document.getElementById('gameArea');
    zonePlatforms.forEach((array) => {
        gameArea.appendChild(createLine.apply(null, array));
    });
}

function loadPortals() {
    $('.portal').remove();
    zoneConnections[currentZone].forEach(function(portalData) {
        let portal = document.createElement('div');
        portal.value = portalData.dest;
        portal.classList = ['portal clickable'];
        portal.setAttribute('draggable', 'false');
        let tooltip = document.createElement('span');
        tooltip.classList = ['textTooltip'];
        let text = 'Lv. ' + mobLevels[zoneMobs[portalData.dest]] + ' ' + mobNames[zoneMobs[portalData.dest]];
        tooltip.innerHTML = text;
        portal.appendChild(tooltip);
        $(portal).css('left', portalData.l);
        $(portal).css('top', portalData.t);
        $(portal).on('click', portal, changeZones);
        $('#lootArea').append(portal);
    });
    $('.portal').on('mousemove', function(event) {
        $(event.currentTarget).children('.textTooltip').css({
            'left': event.pageX +6,
            'top': event.pageY +6,
            'visibility': 'visible'
        });
    });
    $('.portal').on('mouseleave', function(event) {
        $(event.currentTarget).children('.textTooltip').css({
            'visibility': 'hidden'
        });
    });
}

function canEnterThisZone() {
    return true;
}

var noKilling = false;
function changeZones() {
    $(this).off('click');
    this.classList.remove('clickable');
    let success = canEnterThisZone(this.value);
    if (!success) {
        this.classList.add('clickable');
        $(this).on('click', this, changeZones);
        return;
    }
    $('#superBlocker').css('background', 'rgba(0,0,0,0)');
    $('#superBlocker').css('visibility', 'visible');
    $('#superBlocker').css('pointer-events', 'all');
    $('#superBlocker').addClass('fadeToBlack');
    $('#superBlocker').css('background', 'rgba(0,0,0,1)');
    noKilling = true;
    currentZone = this.value;
    gameLoop.mob = {};
    preloadConnectedZones();
}

function preloadConnectedZones(zone=currentZone) {
    let toLoad = [];
    zoneConnections[zone].forEach((portal) => {
        zoneMobs[portal.dest].forEach((mobName) => {
            let mobId = mobIdsFromNames[mobName];
            let animationNames = Object.keys(mobDelays[mobId]);
            animationNames.forEach((animationName) => {
                toLoad.push('./mob/' + mobId + '/' + animationName + '.png');
            });
            // loading their drops too
            // looks like doing this is fine
            mobDropPools[mobName].forEach((poolName) => {
                dropPoolDefinitions[poolName].forEach((itemId) => {
                    toLoad.push('./item/' + itemId + '/icon.png');
                });
            });
        });
    });
    scheduleToGameLoop(0, preloadImages, [toLoad], 'preloading');
}

$('#superBlocker').on('animationend webkitAnimationEnd oAnimationEnd', function(event) { // part of changeZones()
    if ($('#superBlocker').hasClass('fadeToBlack')) { 
        loadPortals();
        $('.mob').remove();
        activeMobs = {};
        numberOfMobs = 0;
        targetableMobs = [];
        $('#superBlocker').removeClass('fadeToBlack');
        $('#superBlocker').addClass('unfadeToBlack');
    }
    else if ($('#superBlocker').hasClass('unfadeToBlack')) {
        noKilling = false;
        $('#superBlocker').css('visibility', 'hidden');
        $('#superBlocker').css('pointer-events', 'none');
        $('#superBlocker').css('background', '');
        $('#superBlocker').removeClass('unfadeToBlack');
    }
});

function loadPlatforms() {
    return;
}

function loadLaddersAndVines() {
    return;
}
