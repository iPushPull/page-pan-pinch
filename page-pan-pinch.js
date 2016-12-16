var PageTouches = (function () {
    function PageTouches(options) {
        var _this = this;
        this.options = {
            bounds: "",
            content: "",
            page: "",
            onDoubleTap: function (pt, ev) { },
        };
        this._scale = {
            last: 1,
            current: 1,
            min: .5,
            max: 2,
        };
        this._pos = {
            x: {
                last: 0,
                current: 0,
            },
            y: {
                last: 0,
                current: 0,
            },
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
            if (ev.tapCount === 2) {
                _this.options.onDoubleTap(_this, ev);
            }
            return;
        };
        this._eventPanMove = function (ev) {
            _this._pos.x.current = _this._pos.x.last + ev.deltaX;
            _this._pos.y.current = _this._pos.y.last + ev.deltaY;
            _this.setWithinBounds();
            _this.update();
        };
        this._eventPanEnd = function (ev) {
            _this._pos.x.last = _this._pos.x.current;
            _this._pos.y.last = _this._pos.y.current;
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
        this._content = document.getElementById(this.options.content);
        this._page = document.getElementById(this.options.page);
        if (!this._bounds || !this._content || !this._page) {
            throw "DOM Elements undefined";
        }
        this._boundsRect = this._bounds.getBoundingClientRect();
        this._pageRect = this._page.getBoundingClientRect();
        this._mc = new Hammer(this._bounds);
        var pan = new Hammer.Pan({ direction: Hammer.DIRECTION_ALL });
        var pinch = new Hammer.Pinch();
        var tap = new Hammer.Tap({ event: "singletap" });
        var doubleTap = new Hammer.Tap({ event: "doubletap", taps: 2 });
        doubleTap.recognizeWith(tap);
        this._mc.add([pinch, pan, doubleTap]);
        this._mc.on("pinchmove", this._eventPinchMove);
        this._mc.on("pinchend", function (ev) {
            _this._eventPinchEnd(ev);
        });
        this._mc.on("tap", function (ev) {
            _this._eventTap(ev);
        });
        this._mc.on("panmove", function (ev) {
            _this._eventPanMove(ev);
        });
        this._mc.on("panend", function (ev) {
            _this._eventPanEnd(ev);
        });
        this.init();
    }
    PageTouches.prototype.init = function () {
        this.setMinScale();
        this.update();
    };
    PageTouches.prototype.update = function () {
        this._content.style.transform = "scale(" + (this._scale.current) + ") translate(" + Math.round(this._pos.x.current) + "px," + Math.round(this._pos.y.current) + "px)";
    };
    PageTouches.prototype.setMinScale = function () {
        this._scale.last = this._scale.current = this._boundsRect.width / this._pageRect.width;
        var hScale = this._boundsRect.height / this._pageRect.height;
        this._scale.min = hScale < this._scale.last ? hScale : this._scale.current;
    };
    PageTouches.prototype.setWithinBounds = function () {
        var tableWidth = this._pageRect.width * this._scale.current;
        var tableHeight = this._pageRect.height * this._scale.current;
        if (tableHeight > this._boundsRect.height && this._pos.y.current < (this._boundsRect.height - tableHeight) * 1 / this._scale.current) {
            this._pos.y.current = (this._boundsRect.height - tableHeight) * 1 / this._scale.current;
        }
        else if (tableHeight < this._boundsRect.height || this._pos.y.current > 0) {
            this._pos.y.current = 0;
        }
        else if (tableHeight < this._boundsRect.height && this._pos.y.current > this._boundsRect.height - tableHeight) {
            this._pos.y.current = this._boundsRect.height - tableHeight;
        }
        if (tableWidth > this._boundsRect.width && this._pos.x.current < (this._boundsRect.width - tableWidth) * 1 / this._scale.current) {
            this._pos.x.current = (this._boundsRect.width - tableWidth) * 1 / this._scale.current;
        }
        else if (tableWidth < this._boundsRect.width || this._pos.x.current > 0) {
            this._pos.x.current = 0;
        }
        else if (this._pos.x.current < this._boundsRect.width - tableWidth) {
            this._pos.x.current = this._boundsRect.width - tableWidth;
        }
    };
    return PageTouches;
}());
//# sourceMappingURL=page-pan-pinch.js.map