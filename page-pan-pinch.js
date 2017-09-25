var PagePanPinch = (function () {
    function PagePanPinch(options) {
        var _this = this;
        this.version = "0.15";
        this._options = {
            prefix: "ppp",
            bounds: "",
            contentView: "",
            contentScroll: "",
            contentZoom: "",
            page: "",
            pageHasChildren: false,
            debug: "",
            zoomCss: false,
            zoomIncrements: .25,
            zoomFit: true,
            scrollBars: false,
            scrollBarWidth: 8,
            scrollBarsInset: false,
            disablePan: false,
            onTap: function (pt, ev) { },
            onDoubleTap: function (pt, ev) { }
        };
        this._scrollBars = false;
        this._scale = {
            last: 1,
            current: 1,
            min: .5,
            max: 2,
            width: 0,
            height: 0
        };
        this._pos = {
            friction: .8,
            updateInterval: 50,
            x: {
                last: 0,
                current: 0,
                vel: 0,
                delta: 0
            },
            y: {
                last: 0,
                current: 0,
                vel: 0,
                delta: 0
            }
        };
        this._scrollBarElements = {
            scrollX: {
                axis: "x",
                element: null,
                type: "scroller",
                className: "scroll-x",
                zIndex: 100,
                drag: false,
                pos: {},
            },
            scrollY: {
                axis: "y",
                element: null,
                type: "scroller",
                className: "scroll-y",
                zIndex: 100,
                drag: false,
                pos: {},
            },
            trackX: {
                axis: "x",
                element: null,
                type: "track",
                className: "track-x",
                zIndex: 10,
                pos: {},
            },
            trackY: {
                axis: "y",
                element: null,
                type: "track",
                className: "track-y",
                zIndex: 10,
                pos: {},
            },
        };
        this._scrollParams = {
            x: {
                parent: "trackX",
                element: "scrollX",
                pos: "mouseX",
                unit: "width",
                dir: "left",
            },
            y: {
                parent: "trackY",
                element: "scrollY",
                pos: "mouseY",
                unit: "height",
                dir: "top",
            },
        };
        this._scrollEvents = false;
        this._isScrolling = false;
        this._init = false;
        this._initScale = false;
        this.initInterval = function () {
            if (_this._options.pageHasChildren && !_this._page.childNodes.length) {
                return;
            }
            clearInterval(_this._initInterval);
            _this._initInterval = undefined;
            _this.setupContainers();
            if (_this._initScale) {
                _this.setMaxMinScale();
            }
            _this.setupScrollbars();
            _this.setupTouch();
            _this.update();
            if (_this._initScale) {
                _this.updateContentScroll();
            }
            _this._init = true;
        };
        this._eventScroll = function (evt) {
            if (!_this._isScrolling) {
                _this._pos.x.current = _this._contentView.scrollLeft;
                _this._pos.y.current = _this._contentView.scrollTop;
                _this.update();
            }
        };
        this._eventScrollWheel = function (evt) {
            if (!_this._scrollBars || !_this._scrollEvents) {
                return;
            }
            _this._isScrolling = true;
            if (_this._eventScrollWheelTimer) {
                clearTimeout(_this._eventScrollWheelTimer);
                _this._eventScrollWheelTimer = undefined;
            }
            var delta = Math.max(-1, Math.min(1, (evt.wheelDelta || -evt.detail)));
            var axis = _this._scrollEvents.indexOf("y") > -1 ? "y" : "x";
            var dir = _this._scrollParams[axis].dir.charAt(0).toUpperCase() + _this._scrollParams[axis].dir.slice(1);
            var scroll = "scroll" + dir;
            _this._pos[axis].current += 20 * delta * -1;
            _this.update();
            _this._pos[axis].current = _this._pos[axis].last = _this._contentView[scroll];
            _this._eventScrollWheelTimer = setTimeout(function () {
                _this._isScrolling = false;
            }, 50);
            evt.preventDefault();
        };
        this._eventScrollMouseMove = function (evt) {
            _this._isScrolling = true;
            for (var e in _this._scrollBarElements) {
                if (!_this._scrollBarElements.hasOwnProperty(e)) {
                    continue;
                }
                var scroller = _this._scrollBarElements[e];
                if (scroller.drag !== true) {
                    continue;
                }
                var paramsAxis = _this._scrollParams[scroller.axis];
                var offset = evt[scroller.axis] - scroller.pos[paramsAxis.pos];
                var pos = scroller.pos[scroller.axis] + offset;
                if (pos < 0) {
                    pos = 0;
                }
                var distance = parseFloat(scroller.element.style[paramsAxis.unit]);
                var distanceRemainder = _this._scrollBounds[paramsAxis.unit] - distance;
                var maxOffset = _this._scrollBounds[paramsAxis.dir] + distanceRemainder;
                if (pos > maxOffset) {
                    pos = maxOffset;
                }
                var scroll_1 = pos;
                _this._pos[scroller.axis].current = _this._pos[scroller.axis].last = scroll_1 * (_this._scrollRect[paramsAxis.unit] / _this._scrollBounds[paramsAxis.unit]);
                _this.update();
                console.log('mouse', 'pos', pos, 'distance', distance, 'scroll', scroll_1);
            }
        };
        this._eventScrollMouseUp = function (evt) {
            _this._isScrolling = false;
            for (var e in _this._scrollBarElements) {
                if (!_this._scrollBarElements.hasOwnProperty(e)) {
                    continue;
                }
                _this._scrollBarElements[e].drag = false;
            }
        };
        this._eventPinchStart = function (ev) {
            _this._scale.last = _this._scale.current;
            _this.clearPanTimer();
            _this.updateContentScroll();
        };
        this._eventPinchMove = function (ev) {
            _this._scale.current = _this._scale.last * ev.scale;
            _this.update();
        };
        this._eventPinchEnd = function (ev) {
            _this._scale.last = _this._scale.current;
            _this.update();
            _this.updateContentScroll();
        };
        this._eventTap = function (ev) {
            if (ev.tapCount === 1) {
                _this._options.onTap(_this, ev);
            }
            else if (ev.tapCount === 2) {
                _this._options.onDoubleTap(_this, ev);
            }
            return;
        };
        this._eventPanStart = function (ev) {
            _this._scale.last = _this._scale.current;
            _this.clearPanTimer();
            _this.updateContentScroll();
        };
        this._eventPanMove = function (ev) {
            _this._pos.x.current = _this._pos.x.last + (ev.deltaX * -1);
            _this._pos.y.current = _this._pos.y.last + (ev.deltaY * -1);
            _this.update();
        };
        this._eventPanEnd = function (ev) {
            _this._pos.x.last = _this._pos.x.current;
            _this._pos.y.last = _this._pos.y.current;
            _this._pos.x.delta = ev.deltaX * -1;
            _this._pos.y.delta = ev.deltaY * -1;
            if (Math.abs(ev.velocity) > .2) {
                _this._panTimer = setInterval(function () {
                    _this.updatePanVel();
                }, _this._pos.updateInterval);
            }
        };
        if (window.Hammer === undefined) {
            throw "Hammer JS not found";
        }
        for (var i in options) {
            if (options.hasOwnProperty(i)) {
                this._options[i] = options[i];
            }
        }
        this._bounds = typeof this._options.bounds === "string" ? document.getElementById(this._options.bounds) : this._options.bounds;
        this._contentView = typeof this._options.contentView === "string" ? document.getElementById(this._options.contentView) : this._options.contentView;
        this._contentScroll = typeof this._options.contentScroll === "string" ? document.getElementById(this._options.contentScroll) : this._options.contentScroll;
        this._contentZoom = typeof this._options.contentZoom === "string" ? document.getElementById(this._options.contentZoom) : this._options.contentZoom;
        this._page = typeof this._options.page === "string" ? document.getElementById(this._options.page) : this._options.page;
        this._debug = typeof this._options.debug === "string" ? document.getElementById(this._options.debug) : this._options.debug;
        if (!this._contentView || !this._bounds || !this._contentScroll || !this._contentZoom || !this._page) {
            throw "DOM Elements undefined";
        }
        this.init(this._options.zoomFit);
    }
    PagePanPinch.prototype.init = function (scale) {
        this._init = false;
        this._initInterval = setInterval(this.initInterval, 10);
        this._initScale = scale;
        this.initInterval();
    };
    PagePanPinch.prototype.refresh = function () {
        this.destroy();
        this.init(this._options.zoomFit);
    };
    PagePanPinch.prototype.zoom = function (direction) {
        if (direction === "in") {
            this._scale.current += this._options.zoomIncrements;
        }
        else {
            this._scale.current -= this._options.zoomIncrements;
        }
        this._scale.last = this._scale.current;
        this.update();
    };
    PagePanPinch.prototype.zoomFit = function (value) {
        this._options.zoomFit = value;
        if (!value) {
            this._scale.last = this._scale.current = 1;
            this._scale.max = 2;
            this._scale.min = .5;
            this._scrollBars = true;
        }
        this.refresh();
    };
    PagePanPinch.prototype.destroy = function () {
        try {
        }
        catch (e) {
            ;
        }
        try {
            window.removeEventListener("mousemove", this._eventScrollMouseMove, false);
            window.removeEventListener("mouseup", this._eventScrollMouseMove, false);
            this._contentView.removeEventListener("mousewheel", this._eventScrollWheel, false);
            this._contentView.removeEventListener("scroll", this._eventScroll, false);
            this._scrollEvents = false;
        }
        catch (e) {
            ;
        }
        try {
            if (this._scrollContainer) {
                this._scrollContainer.parentNode.removeChild(this._scrollContainer);
                this._scrollContainer = undefined;
            }
        }
        catch (e) {
            ;
        }
    };
    PagePanPinch.prototype.getScale = function () {
        return this._scale.current;
    };
    PagePanPinch.prototype.setupScrollbars = function () {
        var _this = this;
        this._scrollBars = false;
        if (this._options.zoomFit === "contain" || this._options.zoomFit === true || !this._options.scrollBars) {
            return;
        }
        this._scrollBounds = this.getBoundingClientRect(this._contentView.getBoundingClientRect());
        this._scrollRect = this.getBoundingClientRect(this._contentScroll.getBoundingClientRect());
        this._scrollRect.height = this._scrollRect.height * this._scale.current;
        this._scrollRect.width = this._scrollRect.width * this._scale.current;
        if (this._scrollBounds.height < this._scrollRect.height || this._scrollBounds.width < this._scrollRect.width) {
            this._scrollBars = true;
        }
        if (!this._scrollBars) {
            return;
        }
        var showAxis = [];
        if (this._scrollBounds.height < this._scrollRect.height) {
            showAxis.push("y");
        }
        if (this._scrollBounds.width < this._scrollRect.width) {
            showAxis.push("x");
        }
        this._scrollEvents = showAxis;
        var _loop_1 = function (element) {
            if (!this_1._scrollBarElements.hasOwnProperty(element)) {
                return "continue";
            }
            var axis = this_1._scrollBarElements[element].axis;
            var e = document.createElement("div");
            e.className = this_1._options.prefix + " " + this_1._options.prefix + "-" + this_1._scrollBarElements[element].className;
            e.style.position = "absolute";
            e.style.zIndex = this_1._scrollBarElements[element].zIndex;
            e.addEventListener("mousedown", function (evt) {
                if (_this._scrollBarElements[element].type === "scroller") {
                    _this._scrollBarElements[element].pos.mouseX = evt.x;
                    _this._scrollBarElements[element].pos.mouseY = evt.y;
                    _this._scrollBarElements[element].pos.x = parseFloat(_this._scrollBarElements[element].element.style.left);
                    _this._scrollBarElements[element].pos.y = parseFloat(_this._scrollBarElements[element].element.style.top);
                    _this._scrollBarElements[element].drag = true;
                    evt.stopPropagation();
                }
                else {
                    _this.onClickScrollbar(_this._scrollBarElements[element], evt);
                }
            });
            this_1._scrollBarElements[element].element = e;
            var className = showAxis.indexOf(axis) !== -1 ? this_1._options.prefix + "-show" : this_1._options.prefix + "-hide";
            e.className = this_1.removeClassname(e.className, this_1._options.prefix + "-show");
            e.className = this_1.removeClassname(e.className, this_1._options.prefix + "-hide");
            e.className = this_1.addClassname(e.className, className);
            var offset = 0;
            if (this_1._options.scrollBarsInset) {
                offset = this_1._options.scrollBarWidth;
            }
            switch (this_1._scrollBarElements[element].type) {
                case "scroller":
                    var xWidth = Math.floor((this_1._scrollBounds.width / this_1._scrollRect.width) * this_1._scrollBounds.width);
                    var yHeight = Math.floor((this_1._scrollBounds.height / this_1._scrollRect.height) * this_1._scrollBounds.height);
                    if (showAxis.indexOf("x") === -1) {
                        xWidth = 0;
                    }
                    if (showAxis.indexOf("y") === -1) {
                        yHeight = 0;
                    }
                    this_1._scrollBarElements[element].length = axis === "x" ? xWidth : yHeight;
                    e.style.left = "0px";
                    e.style.top = "0px";
                    e.style.width = axis === "x" ? xWidth + "px" : this_1._options.scrollBarWidth + "px";
                    e.style.height = axis === "x" ? this_1._options.scrollBarWidth + "px" : yHeight + "px";
                    break;
                default:
                    if (axis === "x") {
                        e.style.left = this_1._contentView.offsetLeft + "px";
                        e.style.top = (this_1._contentView.offsetTop + this_1._scrollBounds.height + offset) + "px";
                    }
                    else {
                        e.style.left = (this_1._contentView.offsetLeft + this_1._scrollBounds.width + offset) + "px";
                        e.style.top = this_1._contentView.offsetTop + "px";
                    }
                    e.style.width = axis === "x" ? this_1._scrollBounds.width + "px" : this_1._options.scrollBarWidth + "px";
                    e.style.height = axis === "x" ? this_1._options.scrollBarWidth + "px" : this_1._scrollBounds.height + "px";
                    break;
            }
        };
        var this_1 = this;
        for (var element in this._scrollBarElements) {
            _loop_1(element);
        }
        if (!this._scrollContainer) {
            this._scrollContainer = document.createElement("div");
            this._scrollBarElements.trackX.element.appendChild(this._scrollBarElements.scrollX.element);
            this._scrollBarElements.trackY.element.appendChild(this._scrollBarElements.scrollY.element);
            this._scrollContainer.appendChild(this._scrollBarElements.trackX.element);
            this._scrollContainer.appendChild(this._scrollBarElements.trackY.element);
        }
        this._bounds.appendChild(this._scrollContainer);
        window.addEventListener("mousemove", this._eventScrollMouseMove, false);
        window.addEventListener("mouseup", this._eventScrollMouseUp, false);
        this._contentView.addEventListener("mousewheel", this._eventScrollWheel, false);
    };
    PagePanPinch.prototype.setupContainers = function () {
        this._contentView.style.overflow = "hidden";
        this._contentView.addEventListener("scroll", this._eventScroll, false);
        this._contentScroll.style.width = this._page.clientWidth + "px";
        this._contentScroll.style.height = this._page.clientHeight + "px";
        this._contentZoom.style.transformOrigin = "0 0";
    };
    PagePanPinch.prototype.setupTouch = function () {
        if (this._mc) {
            this._mc.destroy();
        }
        this._mc = new Hammer(this._contentView);
        var pan = new Hammer.Pan();
        var tap = new Hammer.Tap({ event: "singletap" });
        var doubleTap = new Hammer.Tap({ event: "doubletap", taps: 2 });
        doubleTap.recognizeWith(tap);
        var pinch = new Hammer.Pinch();
        this._mc.add([pan, doubleTap, pinch]);
        if (!this._scrollEvents) {
            this._mc.on("pinchstart", this._eventPinchStart);
            this._mc.on("pinchmove", this._eventPinchMove);
            this._mc.on("pinchend", this._eventPinchEnd);
        }
        this._mc.on("tap", this._eventTap);
        if (!this._options.disablePan) {
            this._mc.on("panstart", this._eventPanStart);
            this._mc.on("panmove", this._eventPanMove);
            this._mc.on("panend", this._eventPanEnd);
        }
    };
    PagePanPinch.prototype.onClickScrollbar = function (element, evt) {
        console.log('onClickScrollbar', evt);
        var scroller = this._scrollBarElements["scroll" + element.axis.toUpperCase()];
        var params = this._scrollParams[element.axis];
        var scrollerPos = parseFloat(scroller.element.style[params.dir]) + scroller.length;
        var delta = evt[element.axis] > scrollerPos;
        this._pos[element.axis].current = this._pos[element.axis].last = delta ? this._scrollRect[params.unit] - this._scrollBounds[params.unit] : 0;
        this.update();
    };
    PagePanPinch.prototype.clearPanTimer = function () {
        if (this._panTimer) {
            clearInterval(this._panTimer);
        }
    };
    PagePanPinch.prototype.updatePanVel = function () {
        this._pos.x.current += this._pos.x.delta;
        this._pos.y.current += this._pos.y.delta;
        this._pos.x.last = this._pos.x.current;
        this._pos.y.last = this._pos.y.current;
        this._pos.x.delta *= this._pos.friction;
        this._pos.y.delta *= this._pos.friction;
        this.update();
        if (Math.abs(this._pos.x.delta) < .01 && Math.abs(this._pos.y.delta) < .01) {
            clearInterval(this._panTimer);
        }
    };
    PagePanPinch.prototype.update = function () {
        this.setWithinBounds();
        this._contentView.scrollLeft = this._pos.x.current;
        this._contentView.scrollTop = this._pos.y.current;
        this._contentZoom.style.transform = this._options.zoomCss ? "translateZ(0px)" : "translateZ(0px) scale(" + this._scale.current + ")";
        if (this._options.zoomCss) {
            this._contentZoom.style.zoom = this._scale.current * 100 + "%";
        }
        this.updateScrollbars();
    };
    PagePanPinch.prototype.updateScrollbars = function () {
        if (!this._scrollBars || !this._scrollEvents) {
            return;
        }
        for (var e in this._scrollParams) {
            if (!this._scrollParams.hasOwnProperty(e)) {
                continue;
            }
            var param = this._scrollParams[e];
            var maxScroll = this._scrollRect[param.unit] - this._scrollBounds[param.unit];
            var scrollDistance = this._scrollBounds[param.unit] - this._scrollBarElements[param.element].length;
            var pos = this._pos[e].current * scrollDistance / maxScroll;
            this._scrollBarElements[param.element].element.style[param.dir] = pos + "px";
        }
    };
    PagePanPinch.prototype.updateContentScroll = function () {
        this._contentScroll.style.width = Math.ceil(this._scale.width) + "px";
        this._contentScroll.style.height = Math.ceil(this._scale.height) + "px";
    };
    PagePanPinch.prototype.setMaxMinScale = function (scale) {
        var scaleWidth = this._contentView.clientWidth / this._page.clientWidth;
        var scaleHeight = this._contentView.clientHeight / this._page.clientHeight;
        var scaleBy = (scaleHeight < scaleWidth) ? scaleHeight : scaleWidth;
        if (this._options.zoomFit === "width") {
            scaleBy = scaleWidth;
        }
        if (this._options.zoomFit === "height") {
            scaleBy = scaleHeight;
        }
        this._scale.last = this._scale.current = scaleBy;
        this._scale.min = scaleBy;
        if (scaleBy < 1) {
            this._scale.max = 2;
        }
        else {
            this._scale.max = scaleBy * 2;
        }
    };
    PagePanPinch.prototype.setWithinBounds = function () {
        if (this._scale.current > this._scale.max) {
            this._scale.current = this._scale.max;
        }
        if (this._scale.current < this._scale.min) {
            this._scale.current = this._scale.min;
        }
        var pageWidth = this._page.clientWidth * this._scale.current;
        var pageHeight = this._page.clientHeight * this._scale.current;
        this._scale.width = pageWidth;
        this._scale.height = pageHeight;
        var maxLeft = pageWidth - this._contentView.clientWidth;
        var maxTop = pageHeight - this._contentView.clientHeight;
        var minLeft = 0;
        var minTop = 0;
        this._pos.x.max = maxLeft;
        this._pos.x.min = minLeft;
        this._pos.y.max = maxTop;
        this._pos.y.min = minTop;
        if (pageWidth > this._contentView.clientWidth) {
            if (this._pos.x.current > maxLeft) {
                this._pos.x.current = maxLeft;
            }
            else if (this._pos.x.current < minLeft) {
                this._pos.x.current = minLeft;
            }
        }
        else {
            this._pos.x.current = minLeft;
        }
        if (pageHeight > this._contentView.clientHeight) {
            if (this._pos.y.current > maxTop) {
                this._pos.y.current = maxTop;
            }
            else if (this._pos.y.current < minTop) {
                this._pos.y.current = minTop;
            }
        }
        else {
            this._pos.y.current = minTop;
        }
        if (this._debug) {
            this._debug.innerHTML = "\n                <table>\n                    <tr>\n                        <td width=\"100\">x</td>\n                        <td align=\"right\">" + this._pos.x.current.toFixed(2) + "</td>\n                    </tr>\n                    <tr>\n                        <td>y</td>\n                        <td align=\"right\">" + this._pos.y.current.toFixed(2) + "</td>\n                    </tr>\n                    <tr>\n                        <td>width</td>\n                        <td align=\"right\">" + pageWidth.toFixed(2) + "</td>\n                    </tr>\n                    <tr>\n                        <td>height</td>\n                        <td align=\"right\">" + pageHeight.toFixed(2) + "</td>\n                    </tr>\n                    <tr>\n                        <td>scale</td>\n                        <td align=\"right\">" + this._scale.last.toFixed(2) + "</td>\n                    </tr>\n                    <tr>\n                        <td>bounds height</td>\n                        <td align=\"right\">" + this._contentView.clientHeight.toFixed(2) + "</td>\n                    </tr>\n                    <tr>\n                        <td>bounds width</td>\n                        <td align=\"right\">" + this._contentView.clientWidth.toFixed(2) + "</td>\n                    </tr>\n                    <tr>\n                        <td>page height</td>\n                        <td align=\"right\">" + this._page.clientHeight.toFixed(2) + "</td>\n                    </tr>\n                    <tr>\n                        <td>page width</td>\n                        <td align=\"right\">" + this._page.clientWidth.toFixed(2) + "</td>\n                    </tr>\n                </table>\n            ";
        }
    };
    PagePanPinch.prototype.addClassname = function (currentName, name) {
        var str = this.removeClassname(currentName, name);
        return (str + " " + name).trim();
    };
    PagePanPinch.prototype.removeClassname = function (currentName, name) {
        var exp = new RegExp("" + name, "ig");
        return currentName.replace(exp, "").trim();
    };
    PagePanPinch.prototype.getBoundingClientRect = function (rect) {
        return {
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            x: rect.x,
            y: rect.y,
        };
    };
    return PagePanPinch;
}());
