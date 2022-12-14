shopInventories = {
    0 : [],
    80001: [1113095, 1342111, 1282036, 1282027, 2870008, 2870021, 2000019, 2046319, 4000001, 4000012],
    80002: []
};

shopStocks = {
    0 : {},
    80001: {
        4000001: 1140
    },
    80002: {}
};

shopWorths = {
    1113095: 15000000,
    1342111: 351000000,
    1282036: 79999,
    1282027: 359000,
    2870008: 1200,
    2870021: 880,
    2000019: 15000,
    2046319: 240000,
    4000001: 34,
    4000012: 10
};

$(() => {
    node = document.getElementById('shopButtonArea');
    shopButtonAppeared(node);
});

function shopButtonAppeared(shopNode) {
    $(shopNode).on('mouseenter', function(event) {
        id = event.currentTarget.getAttribute('value');
        //if (!shopInventories[id].every(checkIfStoreItemsInKnownItems)) {
        //    shopInventories[id].forEach(checkIfWeKnowTheItemName);
        //}
        $(event.currentTarget).off(event);
    });
}

function preloadTheShop() {
    id = this.getAttribute('value');
    //if (!shopInventories[id].every(checkIfStoreItemsInKnownItems)) {
    //    shopInventories[id].forEach(checkIfWeKnowTheItemName);
    //}
    $(this).off('mouseenter');
}

var storageIsOpen = false;
var doubloonsHaveToBeUpdatedNow = false;
function shopLoad(id, isStorage=false) {
    doubloonsHaveToBeUpdatedNow = true;
    updateDoubloons();
    if (isStorage) {
        $('.shopMerchantImage')[0].src = './files/use-as-storage-guy.png';
        $('.sellArea').eq(0).css('background-image', 'url(./files/storage_background.png)');
        $('.sellArea').eq(0).css('content-visibility', 'hidden');
        storageIsOpen = true;
    }
    else {
        $('.shopMerchantImage')[0].src = './files/use-as-shop-guy.png';
        $('.sellArea').eq(0).css('content-visibility', '');
        $('.sellArea').eq(0).css('background-image', 'url(./files/sell_background.png)');
        storageIsOpen = false;
    }
    $('#shopHolder .guiInnerContentArea .shopItemArea:not(.sellArea)').html('');
    if (!shopInventories[id].every(checkIfStoreItemsInKnownItems)) { // Essentially, this is a backup for if I forget to do   shopButtonAppeared(shopNode)
        //shopInventories[id].forEach(checkIfWeKnowTheItemName);
        setTimeout(() => {
            shopInventories[id].forEach(function(i) {
                createItemCard(i, false, shopStocks[id][i], id);
            });
        }, 30); // I really really can't figure out a better way. async: false was deprecated
    } //                                      and nothing else works exactly like that.
    else {
        shopInventories[id].forEach(function(i) {
            createItemCard(i, false, shopStocks[id][i], id);
        });
    }
}

const checkIfStoreItemsInKnownItems = (id) => knownItemNames.includes(id); // i don't know what this means, but it is important

function createItemCard(itemID, playerItem=false, limitedStock=0, shopID=0) {
    if (!limitedStock) {
        limitedStock = 0;
    }
    itemImageSetup(itemID, createItemCardContinued, [itemID, playerItem, limitedStock, shopID]);
}

function createItemCardContinued(newImg, data) {
    itemID = data[0];
    playerItem = data[1];
    limitedStock = data[2];
    shopID = data[3];

    newDiv = document.createElement('div');
    newDiv.classList = ['itemCard clickable'];

    newerDiv = document.createElement('div');
    newerDiv.classList = ['itemCardImageArea'];
    newerDiv.appendChild(newImg);
    newDiv.appendChild(newerDiv);

    newItemName = document.createElement('span');
    newItemName.innerHTML = itemNames[itemID];
    newItemName.classList = ['itemCardName'];
    newDiv.appendChild(newItemName);

    newCoinImg = document.createElement('img');
    newCoinImg.src = './files/doubloon.png';
    newCoinImg.classList = ['itemCardPriceCoin'];
    newCoinImg.value = shopID;
    newDiv.appendChild(newCoinImg);

    if (shopID == '80002') {
        newItemPrice = document.createElement('span');
        newItemPrice.innerHTML = 1;
        newItemPrice.classList = ['itemCardPrice numberText'];
        newDiv.appendChild(newItemPrice);
    }
    else {
        newItemPrice = document.createElement('span');
        if (itemID in shopWorths) {
            newItemPrice.innerHTML = numberWithCommas(shopWorths[itemID]);
        }
        else {
            newItemPrice.innerHTML = '1';
        }
        newItemPrice.classList = ['itemCardPrice numberText'];
        newDiv.appendChild(newItemPrice);
    }
    addSelectionListener(newDiv);
    if (playerItem) {
        $('#shopHolder .guiInnerContentArea .sellArea').append(newDiv);
    }
    else {
        $('#shopHolder .guiInnerContentArea .shopItemArea:not(.sellArea)').append(newDiv);
    }
    if (limitedStock) {
        newerDiv.appendChild(createItemCardStock(limitedStock));
    }
}

function createItemCardStock(amount) {
    newStock = document.createElement('span');
    newStock.innerHTML = amount;
    newStock.classList = ['numberText itemCount'];
    return newStock;
}

function neededToWaitBeforeContinuing(id) { // as in: needed to wait before continuing with getting the item name so it becomes known and saved
    return new Promise(function(resolve, reject) {
        $.ajax({
            type: 'GET',
            url: getUrlForItemName(id),
            success: function(data) {
                resolve(data);
            },
            error: function(err) {
                reject(err);
            }
        });
    });
}

// DISABLED THIS AS OF     JULY 1st 2022
function checkIfWeKnowTheItemName(id) { // every item for the shop and drops goes through here just in case
    if (!knownItemNames.includes(id)) { // but here it only does stuff if the name isn't known
        neededToWaitBeforeContinuing(id).then(function(data) {
            wanted = data['name'];
            itemNames[id] = wanted;
            knownItemNames.push(id);
        }).catch(function(err) {
            console.log(err);
        });
    }
}

function getUrlForItemName(itemID) { //
    url = 'https://maplestory.io/api/GMS/217/item/'.concat(itemID).concat('/name');
    return url;
}

function deleteItem(slotNumber) {
    tab = inventory.getter();
    tab[slotNumber] = 0;
    if (inventory.readyName() == 'Equip') {
        inventory.DetailedEquip[slotNumber] = 0;
    }
    counts[slotNumber] = 0;
    $('.slot')[slotNumber].children[0].remove();
}

var sellingItemId = 0;
var weAreCurrentlySelling = false;
function sellProcess(fastSell=false) {
    if (fastSell) {
        itemBeingSold = fastSell;
        itemBeingSoldId = $(itemBeingSold).find('.item').eq(1).val();
        itemBeingSoldCount = $(itemBeingSold).find('.itemCount').html();
        if (!itemBeingSoldCount) {
            itemBeingSoldCount = 1;
        }
        transferAmount = itemBeingSoldCount;
    }
    $(itemBeingSold).css('pointer-events', 'none');
    $(itemBeingSold).css('visibility', 'hidden');
    sellingItemId = itemBeingSoldId; // ez fix or maybe this is just the brainiac solution?
    if (!fastSell) {
        weAreCurrentlySelling = true;
        dialogTrigger('shop');
    }
    else {
        transferIt(false, true);
        secondPartOfSellProcess(true);
    }
}

function secondPartOfSellProcess(fastSell=false) {
    if (fastSell) {
        soldAmount = itemBeingSoldCount;
    }
    else {
        soldAmount = shopGetTransferAmount();
    }
    remaining = itemBeingSoldCount-soldAmount;
    tab = inventory.getter();
    counts = inventory.countsGetter();
    slotNumber = itemBeingSold.parentElement.getAttribute('data-slotID');
    if (inventory.readyName() == 'Equip' || remaining <= 0) {
        deleteItem(slotNumber);
    }
    else {
        counts[slotNumber] = remaining;
        $('.slot').eq(slotNumber).find('span')[0].innerHTML = remaining;
        $(itemBeingSold).css('left', '0px');
        $(itemBeingSold).css('top', '0px');
        $(itemBeingSold).css('pointer-events', 'auto');
        $(itemBeingSold).css('visibility', 'visible');
    }

    weAreCurrentlySelling = false;
    createItemCard(itemBeingSoldId, true, soldAmount, 0);
    removeSellingTip();
}

function resetSellProcess() { // for when cancel is clicked or escape is pressed to cancel that sell dialog
    $(itemBeingSold).css('left', '0px');
    $(itemBeingSold).css('top', '0px');
    $(itemBeingSold).css('pointer-events', 'auto');
    $(itemBeingSold).css('visibility', 'visible');
    weAreCurrentlySelling = false;
}

function shopGetTransferAmount() { // the dialog box has to be open while this happens; otherwise, it will just return whatever the thing's default value is
    return parseInt($('#smallAmountArea').val());
}

function shopGetItemId() {
    return $('.selectedThing').eq(0).find('img').eq(0).val();
}

function getShop() {
    console.log($('.selectedThing').eq(0).find('img').eq(1));
    return $('.selectedThing').eq(0).find('img').eq(1).val();
}

function shopGetStock() {
    if ($('.selectedThing').eq(0).find('.itemCardImageArea span').eq(0).length) { // this checks if the stock number exists
        return parseInt($('.selectedThing').eq(0).find('.itemCardImageArea span').eq(0).html()); // this gets the stock number
    }
    else {
        return 0; // this is for when the item should have unlimited stock
    }
}

function shopSetStock(amount, target=$('.selectedThing').eq(0)) { // target should be the item card in the shop that you want to edit
    if (target.find('.itemCardImageArea span').eq(0).length) { // this checks if the stock number exists
        target.find('.itemCardImageArea span').eq(0).html(amount.toString());
    }
    else {
        target.find('.itemCardImageArea').append(createItemCardStock(amount));
    }
}

function transferIt(buying, fastSell=false) { // id is only necessary for selling because it can be easily gotten when buying
    if (!fastSell) {
        transferAmount = shopGetTransferAmount();
    }
    if (buying) {
        id = shopGetItemId();
        obtainItem(id, transferAmount);
        value = -1;
        if (shopGetStock()) { // if there is a stock (even though it returns the stock I just wanna know if it's there)
            const newAmount = shopGetStock()-transferAmount;
            if (newAmount <= 0) { // (even though less than 0 shouldn't be possible)
                shopStocks[getShop()][id] = 0;
                const index = shopInventories[getShop()].indexOf(id);
                if (index !== -1) {
                    shopInventories[getShop()].splice(index, 1);
                }
                shopDeleteItemCard();
            }
            else {
                shopStocks[getShop()][id] = newAmount;
                shopSetStock(newAmount);
            }
        }
    }
    else {
        id = itemBeingSoldId;
        value = 1;
    }
    if (storageIsOpen && !fastSell) {
        value = value*transferAmount;
    }
    else {
        console.log(id);
        if (!(id in shopWorths)) {
            value = value*transferAmount;
        }
        else {
            value = value*shopWorths[id]*transferAmount;
        }
        console.log(value);
        console.log(shopWorths[id]);
    }
    updateDoubloons(value); // when buying the value should be negative
    if (fastSell) {
        playSound(sounds[2]);
    }
    // temporary v v v
    console.log(id);
    console.log(value);
    console.log(transferAmount);
    sentence = 'The value of this stuff is ' + numberWithCommas(value) + '.';
    console.log(sentence);
    // temporary ^ ^ ^
}

function shopDeleteItemCard(target=$('.selectedThing').eq(0)) {
    $(target).remove();
}

function removeSellingTip() {
    $('.beforeSellText1').remove();
    $('.beforeSellText2').remove();
}

function doTheyHaveEnoughDoubloons(needed) { // because I'll probably use this in more than one spot I don't know
    if (needed <= doubloons) {
        return true;
    }
    else {
        return false;
    }
}

function shopMaxAffordNumber() { // this will only be used for when they're buying something anyways
    price = parseInt($('.selectedThing').eq(0).find('.itemCardPrice').text().replace(/,/g, ''));
    return Math.floor(doubloons / price);
}

var doubloons = 0;
function updateDoubloons(value=0) {
    doubloons = Number(doubloons) + value;
    if (doubloonsHaveToBeUpdatedNow) {
        document.getElementsByClassName('amountOfDoubloons')[0].innerHTML = numberWithCommas(doubloons);
    }
}
