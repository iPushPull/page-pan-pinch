class PagePanPinch {

    public options: any = {
        bounds: "",
        contentScroll: "",
        contentZoom: "",
        page: "",
        debug: "",
        onTap: (pt, ev) => { },
        onDoubleTap: (pt, ev) => { }
    };

    private _bounds: any;
    private _boundsRect: any;
    private _contentScroll: any;
    private _contentZoom: any;
    private _page: any;
    private _pageRect: any;
    private _debug: any;

    private _scale: any = {
        last: 1,
        current: 1,
        min: .5,
        max: 2
    };

    private _pos: any = {
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

        this._boundsRect = this._bounds.getBoundingClientRect();
        this._pageRect = this._page.getBoundingClientRect();
        this._bounds.style.overflow = "hidden";
        this._contentScroll.style.transformOrigin = "0 0";
        this._contentScroll.style.width = `${this._pageRect.width}px`;
        this._contentScroll.style.height = `${this._pageRect.height}px`;
        this._contentZoom.style.transformOrigin = "50% 50%";

        this.setupTouch();

        this.init(true);

    }

    public init(scale: boolean): void {
        this.setMaxMinScale(scale);
        this.setWithinBounds();
        this.update();
    }

    public refresh(): void {
        this._boundsRect = this._bounds.getBoundingClientRect();
        this.setupTouch();
        this.init(false);
    }

    private setupTouch(): void {
        if (this._mc) {
            this._mc.destroy();
        }
        // touch library
        this._mc = new Hammer(this._bounds);
        let pan: any = new Hammer.Pan({ direction: Hammer.DIRECTION_ALL });
        let pinch: any = new Hammer.Pinch();
        let tap: any = new Hammer.Tap({ event: "singletap" });
        let doubleTap: any = new Hammer.Tap({ event: "doubletap", taps: 2 });
        doubleTap.recognizeWith(tap);

        // add events
        this._mc.add([pan, pinch, doubleTap]);

        // event listeners
        this._mc.on("pinchstart", this._eventPinchStart);
        this._mc.on("pinchmove", this._eventPinchMove);
        this._mc.on("pinchend", this._eventPinchEnd);
        this._mc.on("tap", this._eventTap);
        this._mc.on("panstart", this._eventPanStart);
        this._mc.on("panmove", this._eventPanMove);
        this._mc.on("panend", this._eventPanEnd);        
    }

    private _eventPinchStart = (ev: any): void => {
        this.clearPanTimer();
    };

    private _eventPinchMove = (ev: any): void => {
        this._scale.current = this._scale.last * ev.scale;
        if (this._scale.current > this._scale.max) {
            this._scale.current = this._scale.max;
        }
        if (this._scale.current < this._scale.min) {
            this._scale.current = this._scale.min;
        }
        this.update();
    };

    private _eventPinchEnd = (ev: any): void => {
        this._scale.last = this._scale.current;
        this.setWithinBounds();
        this.update();
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
        this.clearPanTimer();
    };

    private _eventPanMove = (ev: any): void => {

        this._pos.x.current = this._pos.x.last + (ev.deltaX);
        this._pos.y.current = this._pos.y.last + (ev.deltaY);

        this.setWithinBounds();
        this.update();
    };

    private _eventPanEnd = (ev: any): void => {
        this._pos.x.last = this._pos.x.current;
        this._pos.y.last = this._pos.y.current;
        this._pos.x.vel = ev.velocityX;
        this._pos.y.vel = ev.velocityY;
        this._pos.x.delta = ev.deltaX;
        this._pos.y.delta = ev.deltaY;
        if (Math.abs(ev.velocity) > .2) {
            this._panTimer = setInterval(() => {
                this.updatePanVel();
            }, 20);
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
        this.setWithinBounds();
        this.update();
        if (Math.abs(this._pos.x.delta) < .01 && Math.abs(this._pos.y.delta) < .01) {
            clearInterval(this._panTimer);
        }

    }

    private update(): any {

        let width: number = Math.round(this._pageRect.width * this._scale.last);
        let height: number = Math.round(this._pageRect.height * this._scale.last);

        let x: number = Math.round(this._pos.x.current);
        let y: number = Math.round(this._pos.y.current);

        this._contentScroll.style.transform = `translateZ(0px) translate(${x}px, ${y}px)`;
        this._contentZoom.style.transform = `translateZ(0px) scale(${this._scale.current})`;

        if (this._debug) {
            this._debug.innerHTML = `x: ${x}, y: ${y}, width: ${width}, height: ${height}, scale: ${this._scale.last}`;
        }
    }

    private setMaxMinScale(scale: boolean): any {

        if (scale) {
            this._scale.last = this._scale.current = this._boundsRect.width / this._pageRect.width;
        }

        let hScale: number = this._boundsRect.height / this._pageRect.height;
        this._scale.min = hScale < this._scale.last ? hScale : this._scale.current;

        let vScale: number = this._boundsRect.width / this._pageRect.width;
        if (this._scale.max < vScale) {
            this._scale.max = vScale;
        }

    }

    private setWithinBounds(): void {

        let pageWidth: number = this._pageRect.width * this._scale.current;
        let pageHeight: number = this._pageRect.height * this._scale.current;

        let maxLeft: number = (pageWidth - this._pageRect.width) / 2 + (this._pageRect.width - this._boundsRect.width);
        let maxTop: number = (pageHeight - this._pageRect.height) / 2 + (this._pageRect.height - this._boundsRect.height);

        let minLeft: number = (pageWidth - this._pageRect.width) / 2;
        let minTop: number = (pageHeight - this._pageRect.height) / 2;

        if (pageWidth > this._boundsRect.width) {
            if (this._pos.x.current < -maxLeft) {
                this._pos.x.current = -maxLeft;
            } else if (this._pos.x.current >= minLeft) {
                this._pos.x.current = minLeft;
            }
        } else {
            this._pos.x.current = minLeft;
        }

        if (pageHeight > this._boundsRect.height) {
            if (this._pos.y.current < -maxTop) {
                this._pos.y.current = -maxTop;
            } else if (this._pos.y.current >= minTop) {
                this._pos.y.current = minTop;
            }
        } else {
            this._pos.y.current = minTop;
        }

    }


}

