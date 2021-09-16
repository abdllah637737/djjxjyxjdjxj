function getMob(fromList=false) {
    if (fromList) {
        if ($('.easySelected').length > 0) {
            mob = $('.easySelected').html().toLowerCase();
        }
        else {
            mob = 'tino';
        }
    }
    else {
        mob = knownMobs[Math.floor(Math.random() * knownMobs.length)];
    }
    return mob
}

function spawn(mob=getMob(true)) {
    $('#mobArea').append(mobGifSetup(mob))
}

function mobGifSetup(name) { // name in any case
    name = name.toLowerCase();
    gif = '/mob/alive/' + name + '.gif';
    var img = new Image();

    img.classList = ["mob clickable"];
    img.src = gif;
    img.value = name;
    img.setAttribute('draggable', false);
    img.setAttribute('hp', Math.ceil(Math.random() * 6) + 3); // temporary example for HP
    img.setAttribute('maxHP', $(img).attr('hp')); // temporary example for maxHP
    $('#mobHP').text(''.concat($(img).attr('hp'), ' / ', $(img).attr('maxHP')))

    $(img).click(function() {// MOBS TAKE DAMAGE ON CLICK
        newHP = $(this).attr("hp") - 1;
        if (newHP < 0) {
            newHP = 0;
        }
        $('#mobHP').text(''.concat(newHP, ' / ', $(img).attr('maxHP')))
        if (newHP <= 0) {
            mobDie(this)
            console.log(newHP)
        }
        $(this).attr("hp", newHP)
    });
    return img;
}

function mobDie(origin='') {
    if (!origin) {
        target = $('#mobArea img:not(.mobDying)').last();
    }
    else {
        target = $(origin); // it will be activated by clicking the mob so that should catch it
    }
    console.log(target)
    if (target.length > 0 || target.is('img')) {
        target.css('pointer-events', 'none');
        mobName = target.val();
        target.attr('src', '/mob/dead/' + mobName + '.gif')
        target.css('transition-duration', mobDeathDuration[mobName].toString() + 'ms')
        target.addClass('mobDying')
        mobDropAmount = Math.ceil(Math.random() * 6); // temporary example
        dropLoot(mobDropAmount) // temporary example
        console.log('mobDropAmount: ' + mobDropAmount.toString() + '  mob: ' + mobName)
    }
}



$(document).on('transitionend webkitTransitionEnd oTransitionEnd', '.mob', function (event) { // part of the mob death effect
    $(event.currentTarget).remove()
});