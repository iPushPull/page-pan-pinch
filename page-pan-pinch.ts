class PageTouches {

    public options: any = {
        bounds: "",
        content: "",
        page: "",
        onDoubleTap: (pt, ev) => {},
    };

    private _bounds: any;
    private _boundsRect: any;
    private _content: any;
    private _page: any;
    private _pageRect: any;

    private _scale: any = {
        last: 1,
        current: 1,
        min: .5,
        max: 2,
    };

    private _pos: any = {
        x: {
            last: 0,
            current: 0,
        },
        y: {
            last: 0,
            current: 0,
        },
    };

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
        this._content = document.getElementById(this.options.content);
        this._page = document.getElementById(this.options.page);

        if (!this._bounds || !this._content || !this._page) {
            throw "DOM Elements undefined";
        }

        this._boundsRect = this._bounds.getBoundingClientRect();
        this._pageRect = this._page.getBoundingClientRect();

        // touch library
        this._mc = new Hammer(this._bounds);
        let pan: any = new Hammer.Pan({ direction: Hammer.DIRECTION_ALL });
        let pinch: any = new Hammer.Pinch();
        let tap: any = new Hammer.Tap({ event: "singletap" });
        let doubleTap: any = new Hammer.Tap({ event: "doubletap", taps: 2 });
        doubleTap.recognizeWith(tap);

        // add events
        this._mc.add([pinch, pan, doubleTap]);

        // event listeners
        this._mc.on("pinchmove", this._eventPinchMove);
        this._mc.on("pinchend", (ev) => {
            this._eventPinchEnd(ev);
        });
        this._mc.on("tap", (ev) => {
            this._eventTap(ev);
        });
        this._mc.on("panmove", (ev) => {
            this._eventPanMove(ev);
        });
        this._mc.on("panend", (ev) => {
            this._eventPanEnd(ev);
        });

        this.init();

    }

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
        if (ev.tapCount === 2) {
            this.options.onDoubleTap(this, ev);
        }
        return;
    };

    private _eventPanMove = (ev): void => {

        this._pos.x.current = this._pos.x.last + ev.deltaX;
        this._pos.y.current = this._pos.y.last + ev.deltaY;

        this.setWithinBounds();
        this.update();
    };

    private _eventPanEnd = (ev: any): void => {

        this._pos.x.last = this._pos.x.current;
        this._pos.y.last = this._pos.y.current;

    };

    private init(): any {
        this.setMinScale();
        this.update();
    }

    private update(): any {
        this._content.style.transform = "scale(" + (this._scale.current) + ") translate(" + Math.round(this._pos.x.current) + "px," + Math.round(this._pos.y.current) + "px)";
    }

    private setMinScale(): any {

        this._scale.last = this._scale.current = this._boundsRect.width / this._pageRect.width;

        let hScale: number = this._boundsRect.height / this._pageRect.height;
        this._scale.min = hScale < this._scale.last ? hScale : this._scale.current;

    }

    private setWithinBounds(): void {

        let tableWidth: number = this._pageRect.width * this._scale.current;
        let tableHeight: number = this._pageRect.height * this._scale.current;

        if (tableHeight > this._boundsRect.height && this._pos.y.current < (this._boundsRect.height - tableHeight) * 1 / this._scale.current) {
            this._pos.y.current = (this._boundsRect.height - tableHeight) * 1 / this._scale.current;
        } else if (tableHeight < this._boundsRect.height || this._pos.y.current > 0) {
            this._pos.y.current = 0;
        } else if (tableHeight < this._boundsRect.height && this._pos.y.current > this._boundsRect.height - tableHeight) {
            this._pos.y.current = this._boundsRect.height - tableHeight;
        }

        if (tableWidth > this._boundsRect.width && this._pos.x.current < (this._boundsRect.width - tableWidth) * 1 / this._scale.current) {
            this._pos.x.current = (this._boundsRect.width - tableWidth) * 1 / this._scale.current;
        } else if (tableWidth < this._boundsRect.width || this._pos.x.current > 0) {
            this._pos.x.current = 0;
        } else if (this._pos.x.current < this._boundsRect.width - tableWidth) {
            this._pos.x.current = this._boundsRect.width - tableWidth;
        }

    }

}

