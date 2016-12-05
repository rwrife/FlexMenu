var $fmFilterSpacer = $('<div />', {
    "class": "filter-drop-spacer",
    "height": $("#nav").outerHeight()
});

$(window).resize(function() {
    _fmMenuRefresh();
});

$(document).ready(function() {
    _fmMenuRefresh();
});


$(window).scroll(function() {
    if (!$("#nav").hasClass('fix') && $(window).scrollTop() > $("#nav").offset().top) {
        $("#nav").before($fmFilterSpacer);
        $("#nav").addClass("fix");
    } else if ($("#nav").hasClass('fix') && $(window).scrollTop() < $fmFilterSpacer.offset().top) {
        $("#nav").removeClass("fix");
        if (typeof $filterSpacer !== 'undefined')
            $filterSpacer.remove();
    }
    _fmMenuRefresh();
});

function _fmMenuRefresh() {
    var moreMenu = $("#nav > li.nav-more > ul").first();
    var menuBar = $("#nav").first();

    $("#nav > li.nav-more > ul > li").each(function(i, e) {
        var item = $(e);
        if (item.outerWidth() < _fmMenuBarSpace()) {
            item.appendTo(menuBar);
        } else return false;
    });

    $("#nav > li:not(.nav-more)").each(function(i, e) {
        var item = $(e);
        var pos = item.position();
        if (pos != null && pos.top > 0) {
            item.prependTo(moreMenu);
        }
    });

    if (moreMenu.children().length == 0) {
        $("#nav > li.nav-more").hide();
    } else {
        $("#nav > li.nav-more").show();
    }
}

function _fmMenuBarSpace() {
    var menuSpace = 0;
    var lastItem = $("#nav > li:not(.nav-more):last");
    if (lastItem != null) {
        menuSpace = $("#nav").innerWidth() - (lastItem.position().left + lastItem.outerWidth());
    } else {
        menuSpace = $("#nav").innerWidth();
    }
    return menuSpace;
}