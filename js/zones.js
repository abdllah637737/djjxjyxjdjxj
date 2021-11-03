var zoneConnections = {
    1: [{l: 0, t: 0, dest: 2}],
    2: [{l: 200, t: 200, dest: 1}, {l: 500, t: 300, dest: 3}]
};

var zoneMobs = {
    1: ['tino'],
    2: ['tino']
};

var currentZone = 1;

function loadPortals() {
    $('.portal').remove();
    zoneConnections[currentZone].forEach(function(portalData) {
        let portal = new Image();
        portal.src = "/files/portal.gif";
        portal.value = portalData.dest;
        portal.classList = ['portal clickable'];
        $(portal).css('left', portalData.l);
        $(portal).css('top', portalData.t);
        $(portal).on('click', portal, changeZones);
        $('#gameArea').append(portal);
    });
}

function canEnterThisZone() {
    return true
}

function changeZones() {
    $(this).off('click');
    this.classList.remove('clickable');
    let success = canEnterThisZone(this.value);
    if (!success) {
        this.classList.add('clickable');
        $(this).on('click', this, changeZones);
        return
    }
    // fade out, load, then fade in
    currentZone = this.value;
    loadPortals()
}

$(document).ready(function() {
    loadPortals();
});