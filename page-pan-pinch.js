var PagePanPinch = (function () {
    function PagePanPinch(options) {
        var _this = this;
        this.options = {
            bounds: "",
            contentScroll: "",
            contentZoom: "",
            page: "",
            debug: "",
            onTap: function (pt, ev) { },
            onDoubleTap: function (pt, ev) { }
        };
        this._scale = {
            last: 1,
            current: 1,
            min: .5,
            max: 2
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
            _this.clearPanTimer();
        };
        this._eventPinchMove = function (ev) {
            _this._scale.current = _this._scale.last * ev.scale;
            if (_this._scale.current > _this._scale.max) {
                _this._scale.current = _this._scale.max;
            }
            if (_this._scale.current < _this._scale.min) {
                _this._scale.current = _this._scale.min;
            }
            _this.update();
        };
        this._eventPinchEnd = function (ev) {
            _this._scale.last = _this._scale.current;
            _this.setWithinBounds();
            _this.update();
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
            _this.clearPanTimer();
        };
        this._eventPanMove = function (ev) {
            _this._pos.x.current = _this._pos.x.last + (ev.deltaX);
            _this._pos.y.current = _this._pos.y.last + (ev.deltaY);
            _this.setWithinBounds();
            _this.update();
        };
        this._eventPanEnd = function (ev) {
            _this._pos.x.last = _this._pos.x.current;
            _this._pos.y.last = _this._pos.y.current;
            _this._pos.x.vel = ev.velocityX;
            _this._pos.y.vel = ev.velocityY;
            _this._pos.x.delta = ev.deltaX;
            _this._pos.y.delta = ev.deltaY;
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
        this.setWithinBounds();
        this.update();
    };
    PagePanPinch.prototype.refresh = function () {
        this.setupContainers();
        this.setupTouch();
        this.init(false);
    };
    PagePanPinch.prototype.setupContainers = function () {
        this._bounds.style.overflow = "hidden";
        this._contentScroll.style.transformOrigin = "0 0";
        this._contentScroll.style.width = this._page.clientWidth + "px";
        this._contentScroll.style.height = this._page.clientHeight + "px";
        this._contentZoom.style.transformOrigin = "50% 50%";
    };
    PagePanPinch.prototype.setupTouch = function () {
        if (this._mc) {
            this._mc.destroy();
        }
        this._mc = new Hammer(this._bounds);
        var pan = new Hammer.Pan({ direction: Hammer.DIRECTION_ALL });
        var pinch = new Hammer.Pinch();
        var tap = new Hammer.Tap({ event: "singletap" });
        var doubleTap = new Hammer.Tap({ event: "doubletap", taps: 2 });
        doubleTap.recognizeWith(tap);
        this._mc.add([pan, pinch, doubleTap]);
        this._mc.on("pinchstart", this._eventPinchStart);
        this._mc.on("pinchmove", this._eventPinchMove);
        this._mc.on("pinchend", this._eventPinchEnd);
        this._mc.on("tap", this._eventTap);
        this._mc.on("panstart", this._eventPanStart);
        this._mc.on("panmove", this._eventPanMove);
        this._mc.on("panend", this._eventPanEnd);
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
        this.setWithinBounds();
        this.update();
        if (Math.abs(this._pos.x.delta) < .01 && Math.abs(this._pos.y.delta) < .01) {
            clearInterval(this._panTimer);
        }
    };
    PagePanPinch.prototype.update = function () {
        var width = Math.round(this._page.clientWidth * this._scale.current);
        var height = Math.round(this._page.clientHeight * this._scale.current);
        var x = Math.round(this._pos.x.current);
        var y = Math.round(this._pos.y.current);
        this._contentScroll.style.transform = "translateZ(0px) translate(" + x + "px, " + y + "px)";
        this._contentZoom.style.transform = "translateZ(0px) scale(" + this._scale.current + ")";
        if (this._debug) {
            this._debug.innerHTML = "x: " + x + ", y: " + y + ", width: " + width + ", height: " + height + ", scale: " + this._scale.last;
        }
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
        var pageWidth = this._page.clientWidth * this._scale.current;
        var pageHeight = this._page.clientHeight * this._scale.current;
        var maxLeft = (pageWidth - this._page.clientWidth) / 2 + (this._page.clientWidth - this._bounds.clientWidth);
        var maxTop = (pageHeight - this._page.clientHeight) / 2 + (this._page.clientHeight - this._bounds.clientHeight);
        var minLeft = (pageWidth - this._page.clientWidth) / 2;
        var minTop = (pageHeight - this._page.clientHeight) / 2;
        this._pos.x.max = maxLeft;
        this._pos.x.min = minLeft;
        this._pos.y.max = maxTop;
        this._pos.y.min = minTop;
        if (pageWidth > this._bounds.clientWidth) {
            if (this._pos.x.current < -maxLeft) {
                this._pos.x.current = -maxLeft;
            }
            else if (this._pos.x.current >= minLeft) {
                this._pos.x.current = minLeft;
            }
        }
        else {
            this._pos.x.current = minLeft;
        }
        if (pageHeight > this._bounds.clientHeight) {
            if (this._pos.y.current < -maxTop) {
                this._pos.y.current = -maxTop;
            }
            else if (this._pos.y.current >= minTop) {
                this._pos.y.current = minTop;
            }
        }
        else {
            this._pos.y.current = minTop;
        }
    };
    return PagePanPinch;
}());
//# sourceMappingURL=page-pan-pinch.js.map