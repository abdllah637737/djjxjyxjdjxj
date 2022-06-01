var usedSkill = 0;


var realSkill = 0; // used for all skills but especially  dragon slash to access their data in realSkillData (saves time)
var realSkillData = {};
var previousSkill = 0; // for skills that chain together (like dragon slash having 3 slashes)
var usedSkillSuffixes = {}; // {skillId: {'effects': '', 'hit': ''}}
var usedSkillHitDetectionPairs = {}; // {99-999: skillId};  this is for the hitCheckObserver so that a hitCheck can be paired with a certain skill
var cannotUse = [];
var previousSequentialSkillIndex = 0;
var attackSpeedBonus = 1 - .25;
var skillDoneWaiting = true; // this is for letting the player combo to another skill
var debugSkillBounds = false;


function processSkill(skill) {
    if (cannotUse.includes(skill) || !skillDoneWaiting) {
        return;
    }
    cannotUse.push(skill);
    scheduleToGameLoop(classSkills[skill].reuseWaitTime * attackSpeedBonus, removeItemOnce, [cannotUse, skill], 'skill');
    previousSkill = usedSkill;
    usedSkill = skill;
    let skillType = classSkills[skill].TYPE;
    if (skillType == 'attackSequence') {
        let index = 0;
        if (previousSkill == skill && previousSequentialSkillIndex != attackSequences[skill].length-1) {
            index = previousSequentialSkillIndex + 1;
        }
        realSkill = attackSequences[skill][index][0];
        let linesVariable = attackSkillVars[usedSkill][0][index];
        let lines = parseInt(classSkills[usedSkill].usedVariables[linesVariable]);
        let damageVariable = attackSkillVars[usedSkill][1][index];
        let equation = classSkills[usedSkill].usedVariables[damageVariable];
        let damageMult = classSkills[usedSkill].computedVars[equation];
        let targetsVariable = attackSkillVars[usedSkill][2][index];
        let targets = parseInt(classSkills[usedSkill].usedVariables[targetsVariable]);
        realSkillData[realSkill] = {'lines': lines, 'damageMult': damageMult, 'targets': targets, 'sound': sounds[allSoundFiles.indexOf(usedSkill + 'hit.mp3')]};
        let bonuses = getSkillBonuses(skill);
        Object.keys(bonuses).forEach((key) => {
            realSkillData[realSkill][key] += bonuses[key];
        });
        realSkillData[realSkill]['damageMult'] /= 100;
        setSkillSuffixesAndDimensions(skill);
        previousSequentialSkillIndex = index;
        useAttackSkill(realSkill);
    }
    else if (skillType == 'buff') {
        playSound(sounds[allSoundFiles.indexOf(usedSkill + 'use.mp3')]);
        if ('duration' in buffSkillVars[usedSkill]) { // some buffs are toggleable and have no duration
            let durationVariable = buffSkillVars[usedSkill]['duration'];
            let equation = classSkills[usedSkill].usedVariables[durationVariable];
            let durationValue = classSkills[usedSkill].computedVars[equation];
            addBuff(usedSkill, 'skill', durationValue);
        }
        else {
            addBuff(usedSkill, 'skill');
        }
        setSkillSuffixesAndDimensions(usedSkill);
        positionAndAnimateSkillEffects(usedSkill);
    }
    else {
        if (usedSkill == 61101101) { // an attack skill that moves the avatar
            isUsingMovementAttackSkill = true;
            let facingDirectionMult = 1;
            if (AVATAR.style.transform == '' || AVATAR.style.transform == 'scaleX(-1)') {
                facingDirectionMult = -1;
            }
            xVelocity -= facingDirectionMult * 8;
        }
        realSkill = usedSkill;
        let linesVariable = attackSkillVars[usedSkill][0];
        let lines = parseInt(classSkills[usedSkill].usedVariables[linesVariable]);
        if (isNaN(lines)) {
            lines = 1;
        }
        let damageVariable = attackSkillVars[usedSkill][1];
        let equation = classSkills[usedSkill].usedVariables[damageVariable];
        let damageMult = classSkills[usedSkill].computedVars[equation];
        let targetsVariable = attackSkillVars[usedSkill][2];
        let targets = parseInt(classSkills[usedSkill].usedVariables[targetsVariable]);
        realSkillData[realSkill] = {'lines': lines, 'damageMult': damageMult, 'targets': targets, 'sound': sounds[allSoundFiles.indexOf(usedSkill + 'hit.mp3')]};
        if (skillType == 'ballEmitter') {
            let bulletsVariable = attackSkillVars[usedSkill][3];
            let bullets = parseInt(classSkills[usedSkill].usedVariables[bulletsVariable]);
            realSkillData[realSkill]['bullets'] = bullets;    
        }
        let bonuses = getSkillBonuses(skill);
        Object.keys(bonuses).forEach((key) => {
            realSkillData[realSkill][key] += bonuses[key];
        });
        realSkillData[realSkill]['damageMult'] /= 100;
        setSkillSuffixesAndDimensions(skill);
        if (skillType == 'flyingSwords') {
            playSound(sounds[allSoundFiles.indexOf(usedSkill + 'use.mp3')]);
            flyingSwords();
            positionAndAnimateSkillEffects(usedSkill);
            return;
        }
        useAttackSkill(usedSkill);
    }
}

function useAttackSkill(skill) {
    let suffixesSkill = skill;
    if ('originalSkill' in classSkills[skill]) { // example: dragon slash
        suffixesSkill = classSkills[skill].originalSkill;
    }
    if (usedSkillSuffixes[suffixesSkill]['effects'].includes('CharLevel')) {
        Object.keys(classSkills[skill].effects).forEach((skillEffect) => {
            if (skillEffect.includes(usedSkillSuffixes[suffixesSkill]['effects'])) {
                positionAndAnimateOneSkillEffect(skillEffect, classSkills[skill].effects[skillEffect]);
            }
        });
    }
    else {
        positionAndAnimateSkillEffects(skill);
    }
    playSound(sounds[allSoundFiles.indexOf(skill + 'use.mp3')]);
    checkHit(skill);
    if (gameLoop.skillMovements.length > 0) {
        isUsingSkill = false;
        gameLoop.skillMovements = [];
        avatarComputedXPosition += -lastSkillXChange;
        AVATAR.style.left = avatarComputedXPosition + 'px';
        avatarComputedYPosition -= -lastSkillYChange;
        AVATAR.style.top = avatarComputedYPosition + 'px';
    }
    let totalDelay = 0;
    isUsingSkill = true;
    skillDoneWaiting = false;
    lastSkillXChange = 0;
    lastSkillYChange = 0;
    classSkills[skill].action.forEach((frameData) => {
        let frameDelay = frameData[2] * attackSpeedBonus;
        let frameAvatarMovement = [0,0];
        if (frameData.length >= 4) {
            frameAvatarMovement = frameData[3];
        }
        scheduleToGameLoop(totalDelay, skillActionAnimation, [frameData[0], frameData[1], frameAvatarMovement], 'skillMovements');
        if (frameDelay < 0) { // does this happen before the attack? maybe
            return;
        }
        else {
            totalDelay += frameDelay;
        }
    });
    let nextSkillCanBeUsedDelay = totalDelay * 0.8;
    scheduleToGameLoop(nextSkillCanBeUsedDelay, () => {
        skillDoneWaiting = true;
    });
    if (skill == 61101101) { // an attack skill that moves the avatar
        scheduleToGameLoop(totalDelay, () => {
            isUsingMovementAttackSkill = false;
        });
    }
    scheduleToGameLoop(totalDelay, () => {
        isUsingSkill = false;
        avatarComputedXPosition += -lastSkillXChange;
        AVATAR.style.left = avatarComputedXPosition + 'px';
        avatarComputedYPosition -= -lastSkillYChange;
        AVATAR.style.top = avatarComputedYPosition + 'px';
    }, [], 'skillMovements');
}

var lastSkillXChange = 0;
var lastSkillYChange = 0;
function skillActionAnimation(state, frameOfState, avatarPositionChange=[0,0]) {
    setState(state, frameOfState, true);
    let reverse = 1;
    if (AVATAR.style.transform == '' || AVATAR.style.transform == 'scaleX(-1)') {
        reverse = -1;
    }
    avatarComputedXPosition += reverse * avatarPositionChange[0] - lastSkillXChange;
    AVATAR.style.left = avatarComputedXPosition + 'px';
    avatarComputedYPosition -= reverse * avatarPositionChange[1] - lastSkillYChange;
    AVATAR.style.top = avatarComputedYPosition + 'px';
    lastSkillXChange = reverse * avatarPositionChange[0];
    lastSkillYChange = reverse * avatarPositionChange[1];
}

function hitEffect(left, top, skill, reason='') {
    let hitDimensions = classSkills[skill].hit[0]; // this used to be usedSkill not sure why
    let div = document.createElement('div');
    let suffixesSkill = skill;
    if ('originalSkill' in classSkills[skill]) { // example: dragon slash
        suffixesSkill = classSkills[skill].originalSkill;
    }
    if (!(usedSkillSuffixes[suffixesSkill]['hit'].includes('hit0'))) {
        usedSkillSuffixes[suffixesSkill]['hit'] += 'hit0';
    }
    div.style.backgroundImage = 'url(./skills/hit/' + skill + usedSkillSuffixes[suffixesSkill]['hit'] + '.png)'; // this used to be usedSkill not sure why
    div.style.width = hitDimensions[0] + 'px';
    div.style.height = hitDimensions[1] + 'px';
    div.style.position = 'absolute';
    div.style.left = (left - hitDimensions[0] / 2) + 'px';
    div.style.top = (top - hitDimensions[1] / 2) + 'px';
    div.setAttribute('group', reason);
    return div;
}

const marginToAccountFor = parseInt($('#lootBlocker').css('margin-top'));
var isSettingObserverSkillId = false;
var lastSkillPairKey = 99; // 100 - 999
var latestSkillBounds = {}; // skillId: [all 4 of the skill bounds based on where the character was and the screen was AND the gameArea's offsetLeft at the time]
function checkHit(skillId) {
    if (!isSettingObserverSkillId) {
        isSettingObserverSkillId = true;
        let LTRB = classSkills[skillId].LTRB;
        let leftBound = 0;
        let rightBound = 0;
        let totalOffsetLeft = document.getElementById('gameArea').offsetLeft + AVATAR.offsetLeft;
        if (AVATAR.style.transform == '' || AVATAR.style.transform == 'scaleX(-1)') {
            rightBound = totalOffsetLeft - LTRB[0];
            leftBound = totalOffsetLeft - LTRB[2];
        }
        else {
            leftBound = totalOffsetLeft + LTRB[0];
            rightBound = totalOffsetLeft + LTRB[2];
        }
        const topBound = AVATAR.offsetTop + LTRB[1];
        const bottomBound = AVATAR.offsetTop + LTRB[3];
        if (debugSkillBounds) {
            let gameArea = document.getElementById('gameArea');
            gameArea.appendChild(createLine(leftBound, topBound, rightBound, topBound));
            gameArea.appendChild(createLine(leftBound, bottomBound, rightBound, bottomBound));
            gameArea.appendChild(createLine(leftBound, topBound, leftBound, bottomBound));
            gameArea.appendChild(createLine(rightBound, topBound, rightBound, bottomBound));
        }
        latestSkillBounds[skillId] = {
            'left': leftBound, 
            'right': rightBound, 
            'bottom': bottomBound, 
            'top': topBound, 
            'offsetLeft': document.getElementById('gameArea').offsetLeft
        };
        lastSkillPairKey++;
        if (lastSkillPairKey > 999) {
            lastSkillPairKey = 99;
        }
        usedSkillHitDetectionPairs[lastSkillPairKey] = skillId;
        startHitCheckObserver(lastSkillPairKey);
        Array.from(document.getElementsByClassName('mob')).forEach((element) => {
            if (!element.classList.contains('mobDying')) {
                hitCheckObserver.observe(element);
            }
        });
        isSettingObserverSkillId = false;
    }
    else {
        scheduleToGameLoop(0, checkHit, [skillId], 'skill');
    }
}

var hitCheckObserver = new IntersectionObserver(()=>{});
function startHitCheckObserver(skillPairKey) {
    hitCheckObserver = new IntersectionObserver((entries, whereICanGetTheSkillId) => {
        let pairKey = parseInt(whereICanGetTheSkillId.thresholds[0] * 100000);
        let skillId = usedSkillHitDetectionPairs[pairKey];
        let leftSkillBound = latestSkillBounds[skillId].left;
        let rightSkillBound = latestSkillBounds[skillId].right;
        let bottomSkillBound = latestSkillBounds[skillId].bottom;
        let topSkillBound = latestSkillBounds[skillId].top;
        let offsetLeftSkill = latestSkillBounds[skillId].offsetLeft;
        let hitGroup = document.createElement('div');
        let mobHits = 0;
        let groupNumber = randomIntFromInterval(0, 2000000000000);
        let gameArea = document.getElementById('gameArea');
        for (const entry of entries) {
            if (mobHits == realSkillData[skillId]['targets']) {
                break;
            }
            const bounds = entry.boundingClientRect;
            if (
                (between(bounds['left'], leftSkillBound, rightSkillBound)
                    || between(bounds['right'], leftSkillBound, rightSkillBound)
                    || between(leftSkillBound, bounds['left'], bounds['right'])
                    || between(rightSkillBound, bounds['left'], bounds['right']))
                && 
                (between(bounds['top'], topSkillBound, bottomSkillBound)
                    || between(bounds['bottom'], topSkillBound, bottomSkillBound)
                    || between(topSkillBound, bounds['top'], bounds['bottom'])
                    || between(bottomSkillBound, bounds['top'], bounds['bottom']))
            ) {
                let delay = 0;
                let skillType = classSkills[skillId].TYPE;
                if (skillType == 'ballEmitter') {
                    let gameArea = document.getElementById('gameArea');
                    let facingDirectionMult = 1;
                    if (AVATAR.style.transform == '' || AVATAR.style.transform == 'scaleX(-1)') {
                        facingDirectionMult = -1;
                    }
                    let startX = AVATAR.offsetLeft - facingDirectionMult*70;
                    let startY = AVATAR.offsetTop - 90;
                    let endX = bounds['left'] - offsetLeftSkill + bounds['width']/2;
                    let endY = bounds['top'] + bounds['height']/2;
                    let speed = 0.4;
                    delay = getBallEmitterHitDelay(speed, startX, startY, endX, endY);
                    let hitDiv = hitEffect(endX, endY, skillId);
                    hitDiv.style.visibility = 'hidden';
                    gameArea.appendChild(hitDiv);
                    let subject = document.createElement('div');
                    let ball = classSkills[skillId].ball[Object.keys(classSkills[skillId].ball)[0]];
                    let ballDimensions = ball[0];
                    subject.style.backgroundImage = 'url(./skills/ball/' + skillId + 'ball.png)';
                    subject.style.width = ballDimensions[0] + 'px';
                    subject.style.height = ballDimensions[1] + 'px';
                    subject.style.position = 'absolute';
                    subject.style.backgroundPositionX = '0px';
                    let ballCoords = [startX - ballDimensions[0]/2, startY - ballDimensions[1]/2];
                    subject.style.left = ballCoords[0] + 'px';
                    subject.style.top =  ballCoords[1] + 'px';
                    if (startX < endX) {
                        subject.style.transform = 'rotate(' + (getBallEmitterAngle(startX, startY, endX, endY)+3.14) + 'rad)';
                    }
                    else {
                        subject.style.transform = 'rotate(' + (getBallEmitterAngle(startX, startY, endX, endY)) + 'rad)';
                    }
                    gameArea.appendChild(subject);
                    let ballDelays = ball[2];
                    scheduleToGameLoop(0, animateBallEmitter, [ballDimensions[0], subject, ballCoords, ballDelays, [endX-startX, endY-startY], delay, ballDelays[0]], 'movement');
                    scheduleToGameLoop(delay, (someElement) => {
                        someElement.style.visibility = '';
                    }, [hitDiv], 'skill');
                    scheduleToGameLoop(delay, genericSpritesheetAnimation, [[hitDiv], 0, classSkills[skillId].hit[1]]);
                }
                else {
                    hitGroup.appendChild(hitEffect(bounds['left']-offsetLeftSkill+bounds['width']/2, bounds['top']+bounds['height']/2, skillId));
                }
                let data = [entry.target, groupNumber, skillId, [bounds['left']-offsetLeftSkill+bounds['width']/2, bounds['top']]];
                scheduleToGameLoop(delay, mobDamageEvent, data, 'damageNumber');
                mobHits++;
            }
        }
        if (hitGroup.hasChildNodes()) {
            gameArea.appendChild(hitGroup);
            genericSpritesheetAnimation(hitGroup.children, 0, classSkills[skillId].hit[1], deleteGroupWhenDone=true);
        }
        hitCheckObserver.disconnect();
    }, {'threshold': parseFloat("0.00" + skillPairKey + "50")});
}

function getBallEmitterHitDelay(speed, startX, startY, endX, endY) {
    let distance = Math.sqrt(Math.abs(endX-startX) ** 2 + Math.abs(endY-startY) ** 2);
    return (distance / speed);
}

function getBallEmitterAngle(startX, startY, endX, endY) {
    let angle = Math.atan((endY-startY) / (endX-startX));
    return angle;
}

function animateBallEmitter(timeDelta, offset, subject, coords, skillDelays, distanceToEnd, destroyTime, nextFrameTime, frame=0, elapsedTime=0) {
    elapsedTime += timeDelta;
    subject.style.left = (coords[0] + distanceToEnd[0] * (elapsedTime/destroyTime)) + 'px';
    subject.style.top = (coords[1] + distanceToEnd[1] * (elapsedTime/destroyTime)) + 'px';
    if (elapsedTime > nextFrameTime) {
        subject.style.backgroundPositionX = (parseInt(subject.style.backgroundPositionX) - offset) + 'px';
        frame++;
        if (frame == skillDelays.length) {
            frame = 0;
        }
        nextFrameTime += skillDelays[frame];
    }
    if (elapsedTime < destroyTime) {
        scheduleToGameLoop(0, animateBallEmitter, [offset, subject, coords, skillDelays, distanceToEnd, destroyTime, nextFrameTime, frame, elapsedTime], 'movement');
    }
    else {
        subject.remove();
    }
}

function makeSkillCards() {
    let currentSelectedSkillTab = document.getElementsByClassName('selectedSkillTab')[0].getAttribute('value');
    skillsPerClass[character.info.class][currentSelectedSkillTab].forEach((skill) => {
        if (!character.skillLevels[skill]) { // example: if the game updated and a skill was added, someone might not have it
            character.skillLevels[skill] = 0;
        }
        let skillInfoHolder = document.createElement('div');
        skillInfoHolder.classList = ['skillInfoHolder'];
        let tooltip = makeSkillTooltip(skill);
        skillInfoHolder.appendChild(tooltip);
        $(skillInfoHolder).on('mousemove', function(event) {
            $(event.currentTarget).children('.itemTooltip').css({
                'left': event.pageX - 240,
                'top': event.pageY + 16,
                'visibility': 'visible'
            });
        });
        $(skillInfoHolder).on('mouseleave', function(event) {
            $(event.currentTarget).children('.itemTooltip').css({
                'visibility': 'hidden'
            });
        });
        let skillImg = new Image();
        skillImg.src = "./skills/icon/" + skill + ".png";
        skillImg.style.alignSelf = 'center';
        skillImg.style.marginLeft = '2px';
        skillInfoHolder.appendChild(skillImg);
        let everythingElse = document.createElement('div');
        everythingElse.style.marginLeft = '4px';
        everythingElse.style.marginRight = '4px';
        let skillName = document.createElement('div');
        skillName.innerHTML = classSkills[skill].skillName;
        skillName.style.borderBottom = '1px dotted #e8e8e8';
        skillName.style.height = '18px';
        everythingElse.appendChild(skillName);
        let bottomInfo = document.createElement('div');
        bottomInfo.classList = ['skillBottomInfo'];
        let currentLevel = document.createElement('div');
        currentLevel.innerHTML = character.skillLevels[skill].toString();
        currentLevel.style.width = '50%';
        bottomInfo.appendChild(currentLevel);
        let allocateButton = new Image();
        allocateButton.classList = ['skillPointAllocateDisabled'];
        allocateButton.setAttribute('value', skill);
        $(allocateButton).on('click', (event) => {
            let skill = event.currentTarget.getAttribute('value');
            let skillTier = document.getElementsByClassName('selectedSkillTab')[0].getAttribute('value');
            if (character.skillLevels[skill] < classSkills[skill].maxLevel && character.info.skillPoints[skillTier] > 0) {
                character.skillLevels[skill]++;
                let target = document.querySelector('.tooltipBottomArea[value="' + skill + '"]');
                removeAllChildNodes(target);
                let currentLevelText = document.createElement('div');
                currentLevelText.innerHTML = '[Current level: ' + character.skillLevels[skill] + ']';
                target.appendChild(currentLevelText);
                writeSkillHitDescription(target, skill, character.skillLevels[skill]);
                if (character.skillLevels[skill] < classSkills[skill].maxLevel) {
                    let nextLevelText = document.createElement('div');
                    nextLevelText.innerHTML = '[Next level: ' + (character.skillLevels[skill]+1) + ']';
                    target.appendChild(nextLevelText);
                    writeSkillHitDescription(target, skill, character.skillLevels[skill]+1);
                }
                character.info.skillPoints[skillTier]--;
                if (character.info.skillPoints[skillTier] < 1) {
                    makeSkillPointsAllocateable(); // makes them not allocateable
                }
                else if (!(character.skillLevels[skill] < classSkills[skill].maxLevel)) {
                    event.currentTarget.src = '';
                }
                document.getElementById('skillPoints').innerHTML = character.info.skillPoints[skillTier];
                event.currentTarget.previousElementSibling.innerHTML = character.skillLevels[skill];
                if (classSkills[skill].TYPE == 'passive') {
                    Object.keys(getPassiveSkillStats(skill)).forEach((stat) => {
                        getOneCompoundedStat(stat);
                        updateOneCharacterDisplay(stat);
                    });
                }
            }
        });
        bottomInfo.appendChild(allocateButton);
        everythingElse.appendChild(bottomInfo);
        skillInfoHolder.appendChild(everythingElse);
        document.getElementById('skillContentAreaBottomPart').appendChild(skillInfoHolder);
    });
}

function makeSkillTooltip(skill) {
    let tooltip = document.createElement('div');
    tooltip.classList = 'itemTooltip';
    let skillName = document.createElement('div');
    skillName.classList = ['tooltipName skillName'];
    skillName.innerHTML = classSkills[skill].skillName;
    tooltip.appendChild(skillName);
    let topArea = document.createElement('div');
    topArea.classList = ['skillTooltipTopArea'];
    let skillImg = new Image();
    skillImg.src = "./skills/icon/" + skill + ".png";
    skillImg.style.width = '64px';
    skillImg.style.height = '64px';
    skillImg.setAttribute('draggable', 'false');
    topArea.appendChild(skillImg);
    let descriptionArea = document.createElement('div');
    descriptionArea.classList = ['skillDescriptionArea'];
    let masterLevel = document.createElement('div');
    masterLevel.innerHTML = '[Master level: ' + classSkills[skill].maxLevel + ']';
    descriptionArea.appendChild(masterLevel);
    let description = document.createElement('div');
    description.innerHTML = classSkills[skill].description;
    descriptionArea.appendChild(description);
    if ('requirementText' in classSkills[skill]) {
        let requirementText = document.createElement('div');
        requirementText.innerHTML = classSkills[skill].requirementText;
        requirementText.style.color = 'darkorange';
        descriptionArea.appendChild(requirementText);
    }
    topArea.appendChild(descriptionArea);
    tooltip.appendChild(topArea);
    let bottomArea = document.createElement('div');
    bottomArea.classList = ['tooltipBottomArea'];
    bottomArea.setAttribute('value', skill);
    if (character.skillLevels[skill] != 0) {
        let currentLevelText = document.createElement('div');
        currentLevelText.innerHTML = '[Current level: ' + character.skillLevels[skill] + ']';
        bottomArea.appendChild(currentLevelText);
        writeSkillHitDescription(bottomArea, skill, character.skillLevels[skill]);
    }
    if (character.skillLevels[skill] < classSkills[skill].maxLevel) {
        let nextLevelText = document.createElement('div');
        nextLevelText.innerHTML = '[Next level: ' + (character.skillLevels[skill]+1) + ']';
        bottomArea.appendChild(nextLevelText);
        writeSkillHitDescription(bottomArea, skill, character.skillLevels[skill]+1);
    }
    tooltip.appendChild(bottomArea);
    return tooltip;
}

function skillEquationManager(source, level, skill) {
    while (source.search('{.+?}') != -1) {
        originalEquation = source.match('{.+?}')[0];
        equation = originalEquation.slice(1, -1);
        let value = eval(equation.replace('x', level));
        if (character.skillLevels[skill] == level) {
            classSkills[skill].computedVars[equation] = value;
            if (equation == classSkills[skill].usedVariables.mpCon) {
                classSkills[skill].mpCon = value;
            }
        }
        source = source.replace('{' + equation + '}', value);
    }
    return source;
}

function skillOnlyLoadComputedVars(skill) {
    let level = character.skillLevels[skill];
    let repeatCount = classSkills[skill].hitDescriptions.length;
    for (let i=0; i<repeatCount; i++) {
        let textSource = classSkills[skill].hitDescriptions[i];
        while (textSource.search('{.+?}') != -1) {
            originalEquation = textSource.match('{.+?}')[0];
            equation = originalEquation.slice(1, -1);
            let value = eval(equation.replace('x', level));
            if (character.skillLevels[skill] == level) {
                classSkills[skill].computedVars[equation] = value;
                if (equation == classSkills[skill].usedVariables.mpCon) {
                    classSkills[skill].mpCon = value;
                }
            }
            textSource = textSource.replace('{' + equation + '}', value);
        }
    }
}

function writeSkillHitDescription(elementToAppendTo, skill, level) {
    let repeatCount = 1;
    if (classSkills[skill].TYPE == 'attackSequence') {
        repeatCount = attackSkillVars[skill][0].length;
    }
    for (let i=0; i<repeatCount; i++) {
        let string = skillEquationManager(classSkills[skill].hitDescriptions[i], level, skill);
        let textSpot = document.createElement('div');
        textSpot.innerHTML = string;
        elementToAppendTo.appendChild(textSpot);
    }
}

function makeSkillPointsAllocateable() {
    let skillTier = document.getElementsByClassName('selectedSkillTab')[0].getAttribute('value');
    skillsPerClass[character.info.class][skillTier].forEach((skill) => {
        let target = document.querySelector('.skillBottomInfo [value="' + skill + '"]');
        if (character.skillLevels[skill] < classSkills[skill].maxLevel && character.info.skillPoints[skillTier] > 0) {
            target.src = './files/pointsEnabled.png';
            target.classList.add('clickable');
        }
        else {
            target.src = '';
            target.classList.remove('clickable');
        }
    });
}

function getAllocatedPassiveSkills() {
    let skills = [];
    Object.keys(character.skillLevels).forEach((skillId) => {
        if (classSkills[skillId].TYPE == 'passive' && character.skillLevels[skillId] >= 1) {
            skills.push(skillId);
        }
    });
    return skills;
}

function getPassiveOrBuffSkillStats(skillId, varsSource) {
    let data = {};
    Object.keys(varsSource[skillId]).forEach((stat) => {
        let equation = classSkills[skillId].usedVariables[stat];
        let statValue = classSkills[skillId].computedVars[equation];
        if (!statValue) {
            statValue = parseInt(equation);
        }
        let statMeaning = varsSource[skillId][stat];
        data[statMeaning] = statValue;
    });
    return data;
}

function getSkillBonuses(skillId) {
    let skillType = classSkills[skillId].TYPE;
    let bonuses = {};
    if (skillType == 'attackSequence') {
        bonuses = {'lines': 0, 'damageMult': 0, 'targets': 0};
        if (skillId in skillsThatGetEnhanced) {
            Object.keys(skillsThatGetEnhanced[skillId]).forEach((passiveSkillId) => {
                skillOnlyLoadComputedVars(passiveSkillId);
                if (passiveSkillId in character.skillLevels && character.skillLevels[passiveSkillId] >= 1) {
                    Object.keys(bonuses).forEach((stat) => {
                        if (stat in skillsThatGetEnhanced[skillId][passiveSkillId]['stats']) {
                            let statMeaning = skillsThatGetEnhanced[skillId][passiveSkillId]['stats'][stat];
                            let statFormula = classSkills[passiveSkillId].usedVariables[statMeaning];
                            let statValue = classSkills[passiveSkillId].computedVars[statFormula];
                            bonuses[stat] += statValue;
                        }
                    });
                }
            });
        }
    }
    return bonuses;
}

function setSkillSuffixesAndDimensions(skillId) {
    usedSkillSuffixes[skillId] = {};
    usedSkillSuffixes[skillId]['hit'] = '';
    usedSkillSuffixes[skillId]['effects'] = '';
    if (skillId in skillsThatGetEnhanced) {
        let keys = Object.keys(skillsThatGetEnhanced[skillId]);
        let gotHit = false;
        let gotEffect = false;
        for (let i=keys.length-1;i>=0;i--) {
            if (gotHit && gotEffect) {
                break;
            }
            if (character.skillLevels[keys[i]] >= 1) {
                if ('effects' in skillsThatGetEnhanced[skillId][keys[i]] && !gotEffect) {
                    usedSkillSuffixes[skillId]['effects'] = skillsThatGetEnhanced[skillId][keys[i]].effects;
                    gotEffect = true;
                }
                if ('hit' in skillsThatGetEnhanced[skillId][keys[i]] && !gotHit) {
                    usedSkillSuffixes[skillId]['hit'] = skillsThatGetEnhanced[skillId][keys[i]].hit;
                    classSkills[skillId].hit[0] = skillsThatGetEnhanced[skillId][keys[i]].hitDimensions;
                    gotHit = true;
                }
            }
        }
    }
}

function positionAndAnimateSkillEffects(skill=0, additionalOffsets=[0,0]) {
    Object.keys(classSkills[skill].effects).forEach((effectName) => {
        positionAndAnimateOneSkillEffect(effectName, classSkills[skill].effects[effectName], additionalOffsets);
    });
}

function positionAndAnimateOneSkillEffect(effectName='', skillEffect=[], additionalOffsets=[0,0]) {
    let div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.backgroundPositionX = '0px';
    div.style.backgroundImage = 'url(./skills/effect/' + effectName + '.png)';
    let dimensions = skillEffect[0];
    div.style.width = dimensions[0] + 'px';
    div.style.height = dimensions[1] + 'px';
    let origin = skillEffect[1];
    div.style.top = AVATAR.offsetTop - origin[1] + additionalOffsets[1] + 'px';
    div.style.transform = AVATAR.style.transform || 'scaleX(-1)';
    if (AVATAR.style.transform == '' || AVATAR.style.transform == 'scaleX(-1)') {
        div.style.left = AVATAR.offsetLeft + origin[0] - dimensions[0] + additionalOffsets[0] + 'px';
    }
    else {
        div.style.left = AVATAR.offsetLeft - origin[0] + additionalOffsets[0] + 'px';
    }
    document.getElementById('gameArea').appendChild(div);
    genericSpritesheetAnimation([div], 0, skillEffect[2]);
}

function skillPreplannedHit(target, skillId) { // target=element (like a mob), skillId=skillId
    let locationCoords = [target.offsetLeft + parseInt(target.style.width)/2, 769 + target.offsetTop - parseInt(target.style.height)/2];
    let hitDiv = hitEffect(locationCoords[0], locationCoords[1], skillId);
    gameArea.appendChild(hitDiv);
    scheduleToGameLoop(0, genericSpritesheetAnimation, [[hitDiv], 0, classSkills[skillId].hit[1]]);
    if (target.classList.contains('mobDying')) {
        return;
    }
    let groupNumber = randomIntFromInterval(0, 2000000000000);
    let data = [target, groupNumber, skillId, locationCoords];
    scheduleToGameLoop(0, mobDamageEvent, data, 'damageNumber');
    return;
}

flyingSwordsAreUp = false;
function flyingSwords() {
    let positions = [
        [0, 140],
        [-50, 110],
        [50, 110]
    ];
    if (flyingSwordsAreUp) {
        let numberOfMobs = document.getElementsByClassName('mob').length;
        if (numberOfMobs == 0) {
            return;
        }
        flyingSwordsAreUp = false;
        let theElements = document.getElementsByClassName('flyingSword');
        let GAME_AREA = document.getElementById('gameArea');
        Array.from(theElements).forEach((elem) => {
            elem.classList.remove('specialHoveringAnimation');
            elem.style.left = parseInt(elem.style.left) + AVATAR.offsetLeft + 'px';
            elem.style.top = parseInt(elem.style.top) + AVATAR.offsetTop + 'px';
            elem.style.position = 'absolute';
            elem.style.zIndex = 3;
            elem.style.pointerEvents = 'none';
            elem.style.transform = AVATAR.style.transform;
            GAME_AREA.appendChild(elem);
            numberOfMobs = document.getElementsByClassName('mob').length; // re-get this value just in case
            let mobNumber = randomIntFromInterval(0, numberOfMobs-1);
            let target = document.getElementsByClassName('mob')[mobNumber];
            moveSKillAlongCurvyPath(elem, target, skillPreplannedHit, [target, 61101002], true, 0.01, 0.03, 3, 0.02);
        });
        while (theElements.length > 0) {
            theElements[0].classList.remove('flyingSword');
        }
    }
    else {
        flyingSwordsAreUp = true;
        let swordCount = 0;
        positions.forEach((someCoords) => {
            let group = drawAnItemWithoutAnimating(1402179, 'stand1', 0, 0, 0, 135);
            let additionalOffsets = [-4, -3];
            let additionalOffsets2 = [-4, -39];
            directionDependentXOffset = 0;
            directionDependentXOffset2 = 0;
            if (swordCount == 1) {
                directionDependentXOffset -= 100;
                directionDependentXOffset2 -= 100;
            }
            if (swordCount == 2) {
                directionDependentXOffset += 100;
                directionDependentXOffset2 += 100;
            }
            swordCount++;
            // flames
            let div = document.createElement('div');
            div.style.position = 'absolute';
            div.style.backgroundPositionX = '0px';
            div.style.backgroundImage = 'url(./skills/forceAtom/forceAtom2atom1parentAtom.png)';
            let particleDimensions = classSkills[61101002].particles.dimensions.forceAtom2atom1parentAtom;
            div.style.width = particleDimensions[0] + 'px';
            div.style.height = particleDimensions[1] + 'px';
            div.style.top = -particleDimensions[1] / 2 + additionalOffsets[1] + 'px';
            div.style.transform = AVATAR.style.transform || 'scaleX(-1)';
            if (AVATAR.style.transform == '' || AVATAR.style.transform == 'scaleX(-1)') {
                div.style.left = -particleDimensions[0] / 2 + additionalOffsets[0] + 'px';
            }
            else {
                div.style.left = -particleDimensions[0] / 2 + additionalOffsets[0] + 'px';
            }
            // tip
            div.style.transform += 'rotate(90deg)';
            let div2 = document.createElement('div');
            div2.style.position = 'absolute';
            div2.style.backgroundPositionX = '0px';
            div2.style.backgroundImage = 'url(./skills/forceAtom/forceAtom2atom1parentAtomAdd1effect.png)';
            let particleDimensions2 = classSkills[61101002].particles.dimensions.forceAtom2atom1parentAtomAdd1effect;
            div2.style.width = particleDimensions2[0] + 'px';
            div2.style.height = particleDimensions2[1] + 'px';
            div2.style.top = -particleDimensions2[1] / 2 + additionalOffsets2[1] + 'px';
            div2.style.transform = AVATAR.style.transform || 'scaleX(-1)';
            div2.style.zIndex = 69;
            if (AVATAR.style.transform == '' || AVATAR.style.transform == 'scaleX(-1)') {
                div2.style.left = -particleDimensions2[0] / 2 + additionalOffsets2[0] + 'px';
            }
            else {
                div2.style.left = -particleDimensions2[0] / 2 + additionalOffsets2[0] + 'px';
            }
            div2.style.transform += 'rotate(90deg)';
            group.forEach((part) => {
                part.style.position = 'absolute';
                part.style.left = someCoords[0] + 'px';
                part.style.top = -someCoords[1] + 'px';
                part.classList.add('specialHoveringAnimation', 'flyingSword');
                part.appendChild(div);
                part.appendChild(div2);
                part.setAttribute('current-angle', 0);
            });
            genericSpritesheetAnimation([div], 0, classSkills[61101002].particles.delays.forceAtom2atom1parentAtom, false, true);
        });
    }
}

// requires an element that is already prepared to be moved (has "position: absolute" and is already at a good starting position)
// AND it requires the initial orientation to have the pointy end (whatever hits the target) to be at the top
// AND it requires a 'currentAngle' attribute in the elem
function moveSKillAlongCurvyPath(elem, target, finalCallback, data, movingTarget=false, turnPower=0.01, turnAcceleration=0, speed=1, acceleration=0) {
    let targetLocation = [0, 0];
    if (target.classList.contains('mobDying') || noKilling) { // if mob died then disappear so it doesnt look weird
        elem.remove();
        return;
    }
    if (movingTarget) { // "target" is an element
        targetLocation = [target.offsetLeft, target.offsetTop+716];
    }
    else { // "target" is coordinates
        targetLocation = target;
    }
    if (between(parseFloat(elem.style.left), targetLocation[0] - 5, targetLocation[0] + 5) && 
            between(parseFloat(elem.style.top), targetLocation[1] - 5, targetLocation[1] + 5)) {
        scheduleToGameLoop(1, finalCallback, data, 'skill');
        elem.remove();
        return;
    }
    let currentAngle = elem.getAttribute('current-angle');
    let targetAngle = Math.atan((targetLocation[0] - elem.offsetLeft) / (targetLocation[1] - elem.offsetTop)) * 57.3; // 57.3 is about 180/pi (rad -> deg)
    if (elem.offsetTop < targetLocation[1]) {
        targetAngle -= 180;
    }
    elem.setAttribute('target-angle', targetAngle); // for TESTING
    let nextAngle = 0;
    if (between(currentAngle, targetAngle-turnPower, targetAngle+turnPower)) {
        nextAngle = targetAngle;
    }
    else {
        if (currentAngle < targetAngle) {
            nextAngle = parseInt(currentAngle) + turnPower;
        }
        else {
            nextAngle = parseInt(currentAngle) - turnPower;
        }
    }
    if (elem.style.transform.indexOf('-') == 7) {// if it has the "-" in scaleX -> which means if it is flipped (this is the fast way of checking)
        elem.style.transform = 'scaleX(-1) rotate(' + nextAngle + 'deg)';
    }
    else {
        elem.style.transform = 'scaleX(1) rotate(' + -nextAngle + 'deg)';
    }
    elem.style.left = parseFloat(elem.style.left) - speed * Math.cos(angleFixer(nextAngle) / 57.3) + 'px';
    elem.style.top = parseFloat(elem.style.top) - speed * Math.sin(angleFixer(nextAngle) / 57.3) + 'px';
    elem.setAttribute('current-angle', nextAngle);
    scheduleToGameLoop(0, moveSKillAlongCurvyPath, [elem, target, finalCallback, data, movingTarget, turnPower+turnAcceleration, turnAcceleration, speed+acceleration, acceleration], 'skill');
}
