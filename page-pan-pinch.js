var PagePanPinch = (function () {
    function PagePanPinch(options) {
        var _this = this;
        this.version = "0.14";
        this.options = {
            bounds: "",
            contentScroll: "",
            contentZoom: "",
            page: "",
            debug: "",
            zoomIncrements: .25,
            onTap: function (pt, ev) { },
            onDoubleTap: function (pt, ev) { }
        };
        this._scale = {
            last: 1,
            current: 1,
            min: .5,
            max: 2,
            width: 0,
            height: 0
        };
        this._pos = {
            friction: .9,
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
        this._eventPinchStart = function (ev) {
            _this._clearPanTimer();
        };
        this._eventPinchMove = function (ev) {
            _this._scale.current = _this._scale.last * ev.scale;
            _this.update();
        };
        this._eventPinchEnd = function (ev) {
            _this._scale.last = _this._scale.current;
            _this.update();
            _this._contentScroll.style.width = _this._scale.width + "px";
            _this._contentScroll.style.height = _this._scale.height + "px";
        };
        this._eventTap = function (ev) {
            if (ev.tapCount === 1) {
                _this.options.onTap(_this, ev);
            }
            else if (ev.tapCount === 2) {
                _this.options.onDoubleTap(_this, ev);
            }
            return;
        };
        this._eventPanStart = function (ev) {
            _this._clearPanTimer();
        };
        this._eventPanMove = function (ev) {
            _this._pos.x.current = _this._pos.x.last + (ev.deltaX * -1);
            _this._pos.y.current = _this._pos.y.last + (ev.deltaY * -1);
            _this.update();
        };
        this._eventPanEnd = function (ev) {
            _this._pos.x.last = _this._pos.x.current;
            _this._pos.y.last = _this._pos.y.current;
            _this._pos.x.vel = ev.velocityX * -1;
            _this._pos.y.vel = ev.velocityY * -1;
            _this._pos.x.delta = ev.deltaX * -1;
            _this._pos.y.delta = ev.deltaY * -1;
            if (Math.abs(ev.velocity) > .2) {
                _this._panTimer = setInterval(function () {
                    _this.updatePanVel();
                }, 20);
            }
        };
        if (window.Hammer === undefined) {
            throw "Hammer JS not found";
        }
        for (var i in options) {
            if (options.hasOwnProperty(i)) {
                this.options[i] = options[i];
            }
        }
        this._bounds = document.getElementById(this.options.bounds);
        this._contentScroll = document.getElementById(this.options.contentScroll);
        this._contentZoom = document.getElementById(this.options.contentZoom);
        this._page = document.getElementById(this.options.page);
        this._debug = document.getElementById(this.options.debug);
        if (!this._bounds || !this._contentScroll || !this._contentZoom || !this._page) {
            throw "DOM Elements undefined";
        }
        this.setupContainers();
        this.setupTouch();
        this.init(true);
    }
    PagePanPinch.prototype.init = function (scale) {
        this.setMaxMinScale(scale);
        this.update();
    };
    PagePanPinch.prototype.refresh = function () {
        this.setupContainers();
        this.setupTouch();
        this.init(false);
    };
    PagePanPinch.prototype.zoom = function (direction) {
        if (direction === "in") {
            this._scale.current += this.options.zoomIncrements;
        }
        else {
            this._scale.current -= this.options.zoomIncrements;
        }
        this._scale.last = this._scale.current;
        this.update();
    };
    PagePanPinch.prototype.setupContainers = function () {
        this._contentZoom.style.transformOrigin = "0 0";
        this._contentScroll.style.width = this._page.clientWidth + "px";
        this._contentScroll.style.height = this._page.clientHeight + "px";
        this._contentZoom.style.transformOrigin = "0 0";
    };
    PagePanPinch.prototype.setupTouch = function () {
        if (this._mc) {
            this._mc.destroy();
        }
        this._mc = new Hammer(this._bounds);
        var pan = new Hammer.Pan();
        var tap = new Hammer.Tap({ event: "singletap" });
        var doubleTap = new Hammer.Tap({ event: "doubletap", taps: 2 });
        doubleTap.recognizeWith(tap);
        var pinch = new Hammer.Pinch();
        this._mc.add([pan, doubleTap, pinch]);
        this._mc.on("pinchstart", this._eventPinchStart);
        this._mc.on("pinchmove", this._eventPinchMove);
        this._mc.on("pinchend", this._eventPinchEnd);
        this._mc.on("tap", this._eventTap);
        this._mc.on("panstart", this._eventPanStart);
        this._mc.on("panmove", this._eventPanMove);
        this._mc.on("panend", this._eventPanEnd);
    };
    PagePanPinch.prototype._clearPanTimer = function () {
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
        this._bounds.scrollLeft = this._pos.x.current;
        this._bounds.scrollTop = this._pos.y.current;
        this._contentZoom.style.transform = "translateZ(0px) scale(" + this._scale.current + ")";
    };
    PagePanPinch.prototype.setMaxMinScale = function (scale) {
        var scaleWidth = this._bounds.clientWidth / this._page.clientWidth;
        if (scale) {
            this._scale.last = this._scale.current = scaleWidth;
        }
        this._scale.min = scaleWidth;
        if (scaleWidth < 1) {
            this._scale.max = 2;
        }
        else {
            this._scale.max = scaleWidth * 2;
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
        var maxLeft = pageWidth - this._bounds.clientWidth;
        var maxTop = pageHeight - this._bounds.clientHeight;
        var minLeft = 0;
        var minTop = 0;
        this._pos.x.max = maxLeft;
        this._pos.x.min = minLeft;
        this._pos.y.max = maxTop;
        this._pos.y.min = minTop;
        if (pageWidth > this._bounds.clientWidth) {
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
        if (pageHeight > this._bounds.clientHeight) {
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
            this._debug.innerHTML = "x: " + this._pos.x.current + ", y: " + this._pos.y.current + ", width: " + pageWidth + ", height: " + pageHeight + ", scale: " + this._scale.last;
        }
    };
    return PagePanPinch;
}());
//# sourceMappingURL=page-pan-pinch.js.map