class PagePanPinch {

    public version: string = "0.15";

    public options: any = {
        bounds: "",
        contentScroll: "",
        contentZoom: "",
        page: "",
        pageHasChildren: false,
        debug: "",
        zoomIncrements: .25,
        zoomFit: true,
        onTap: (pt, ev) => { },
        onDoubleTap: (pt, ev) => { }
        // onSwipe: (pt, ev, direction) => { }
    };

    private _bounds: any;
    private _contentScroll: any;
    private _contentZoom: any;
    private _page: any;
    private _debug: any;

    private _scale: any = {
        last: 1,
        current: 1,
        min: .5,
        max: 2,
        width: 0,
        height: 0
    };

    private _pos: any = {
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

    private _panTimer: any;

    // Hammer Libary
    private _mc: any;

    constructor(options: any) {

        if (window.Hammer === undefined) {
            throw "Hammer JS not found";
        }

        // setup options
        for (let i in options) {
            if (options.hasOwnProperty(i)) {
                this.options[i] = options[i];
            }
        }

        // dom elements
        this._bounds = document.getElementById(this.options.bounds);
        this._contentScroll = document.getElementById(this.options.contentScroll);
        this._contentZoom = document.getElementById(this.options.contentZoom);
        this._page = document.getElementById(this.options.page);
        this._debug = document.getElementById(this.options.debug);

        if (!this._bounds || !this._contentScroll || !this._contentZoom || !this._page) {
            throw "DOM Elements undefined";
        }

        this.init(this.options.zoomFit);

    }

    public init(scale: boolean): void {
        let i: any = setInterval(() => {
            if (this.options.pageHasChildren && !this._page.childNodes.length) {
                return;
            }
            clearInterval(i);
            i = undefined;
            this.setupContainers();
            this.setupTouch();
            if (scale) {
                this.setMaxMinScale();
            }
            this.update();
            if (scale) {
                this.updateContentScroll();
            }
        }, 10);
    }

    public refresh(): void {
        this.init(this.options.zoomFit);
    }

    public zoom(direction: string): void {
        if (direction === "in") {
            this._scale.current += this.options.zoomIncrements;
        } else {
            this._scale.current -= this.options.zoomIncrements;
        }
        this._scale.last = this._scale.current;
        this.update();
    }

    public zoomFit(value: boolean): void {
        this.options.zoomFit = value;
        if (!value) {
            this._scale.last = this._scale.current = 1;
            this._scale.max = 2;
            this._scale.min = .5;
        }
        this.refresh();
    }

    private setupContainers(): void {
        // this._bounds.style.overflow = "hidden";
        this._contentZoom.style.transformOrigin = "0 0";
        this._contentScroll.style.width = `${this._page.clientWidth}px`;
        this._contentScroll.style.height = `${this._page.clientHeight}px`;
        this._contentZoom.style.transformOrigin = "0 0";
    }

    private setupTouch(): void {
        if (this._mc) {
            this._mc.destroy();
        }
        // touch library
        this._mc = new Hammer(this._bounds);
        // let swipe: any = new Hammer.Swipe();
        let pan: any = new Hammer.Pan();
        let tap: any = new Hammer.Tap({ event: "singletap" });
        let doubleTap: any = new Hammer.Tap({ event: "doubletap", taps: 2 });
        doubleTap.recognizeWith(tap);
        let pinch: any = new Hammer.Pinch();
        this._mc.add([pan, doubleTap, pinch]);

        // event listeners
        this._mc.on("pinchstart", this._eventPinchStart);
        this._mc.on("pinchmove", this._eventPinchMove);
        this._mc.on("pinchend", this._eventPinchEnd);
        this._mc.on("tap", this._eventTap);
        this._mc.on("panstart", this._eventPanStart);
        this._mc.on("panmove", this._eventPanMove);
        this._mc.on("panend", this._eventPanEnd);

    }

    // private _eventSwipe = (ev: any): void => {
    //     this.options.onSwipe(this, ev, ev.velocityX > 0 ? "right" : "left" );
    // };

    private _eventPinchStart = (ev: any): void => {
        this._scale.last = this._scale.current;
        this.clearPanTimer();
        this.updateContentScroll();
    };

    private _eventPinchMove = (ev: any): void => {
        this._scale.current = this._scale.last * ev.scale;
        this.update();
    };

    private _eventPinchEnd = (ev: any): void => {
        this._scale.last = this._scale.current;
        this.update();
        this.updateContentScroll();
    };

    private _eventTap = (ev: any): void => {
        if (ev.tapCount === 1) {
            this.options.onTap(this, ev);
        } else if (ev.tapCount === 2) {
            this.options.onDoubleTap(this, ev);
        }
        return;
    };

    private _eventPanStart = (ev: any): void => {
        this._scale.last = this._scale.current;
        this.clearPanTimer();
        this.updateContentScroll();
    };

    private _eventPanMove = (ev: any): void => {
        this._pos.x.current = this._pos.x.last + (ev.deltaX * -1);
        this._pos.y.current = this._pos.y.last + (ev.deltaY * -1);
        this.update();
    };

    private _eventPanEnd = (ev: any): void => {
        this._pos.x.last = this._pos.x.current;
        this._pos.y.last = this._pos.y.current;
        this._pos.x.delta = ev.deltaX * -1;
        this._pos.y.delta = ev.deltaY * -1;
        if (Math.abs(ev.velocity) > .2) {
            this._panTimer = setInterval(() => {
                this.updatePanVel();
            }, this._pos.updateInterval);
        }
    };

    private clearPanTimer(): void {
        if (this._panTimer) {
            clearInterval(this._panTimer);
        }
    }

    private updatePanVel(): void {
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

    }

    private update(): any {

        this.setWithinBounds();
        this._bounds.scrollLeft = this._pos.x.current;
        this._bounds.scrollTop = this._pos.y.current;
        this._contentZoom.style.transform = `translateZ(0px) scale(${this._scale.current})`;

    }

    private updateContentScroll(): void {
        this._contentScroll.style.width = `${Math.ceil(this._scale.width)}px`;
        this._contentScroll.style.height = `${Math.ceil(this._scale.height)}px`;
    }

    private setMaxMinScale(scale: boolean): void {

        let scaleWidth: number = this._bounds.clientWidth / this._page.clientWidth;
        let scaleHeight: number = this._bounds.clientHeight / this._page.clientHeight;
        let scaleBy: number = (scaleHeight < scaleWidth) ? scaleHeight : scaleWidth;
        if (this.options.zoomFit === "width") {
            scaleBy = scaleWidth;
        }
        if (this.options.zoomFit === "height") {
            scaleBy = scaleHeight;
        }

        this._scale.last = this._scale.current = scaleBy;

        this._scale.min = scaleBy;

        if (scaleBy < 1) {
            this._scale.max = 2;
        } else {
            this._scale.max = scaleBy * 2;
        }

    }

    private setWithinBounds(): void {

        // contain scale
        if (this._scale.current > this._scale.max) {
            this._scale.current = this._scale.max;
        }
        if (this._scale.current < this._scale.min) {
            this._scale.current = this._scale.min;
        }

        // set translate boundaries
        let pageWidth: number = this._page.clientWidth * this._scale.current;
        let pageHeight: number = this._page.clientHeight * this._scale.current;

        this._scale.width = pageWidth;
        this._scale.height = pageHeight;

        let maxLeft: number = pageWidth - this._bounds.clientWidth;
        let maxTop: number = pageHeight - this._bounds.clientHeight;

        let minLeft: number = 0; // (pageWidth - this._bounds.clientWidth) / 2;
        let minTop: number = 0; // (pageHeight - this._bounds.clientHeight) / 2;

        this._pos.x.max = maxLeft;
        this._pos.x.min = minLeft;
        this._pos.y.max = maxTop;
        this._pos.y.min = minTop;

        if (pageWidth > this._bounds.clientWidth) {
            if (this._pos.x.current > maxLeft) {
                this._pos.x.current = maxLeft;
            } else if (this._pos.x.current < minLeft) {
                this._pos.x.current = minLeft;
            }
        } else {
            this._pos.x.current = minLeft;
        }

        if (pageHeight > this._bounds.clientHeight) {
            if (this._pos.y.current > maxTop) {
                this._pos.y.current = maxTop;
            } else if (this._pos.y.current < minTop) {
                this._pos.y.current = minTop;
            }
        } else {
            this._pos.y.current = minTop;
        }

        // debug
        if (this._debug) {
            this._debug.innerHTML = `x: ${this._pos.x.current}, y: ${this._pos.y.current}, width: ${pageWidth}, height: ${pageHeight}, scale: ${this._scale.last}`;
        }

    }


}

