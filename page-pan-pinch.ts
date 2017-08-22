class PagePanPinch {

    public version: string = "0.15";

    private _options: any = {
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
        zoomFit: true, // false, true, width, height
        scrollBars: false,
        scrollBarWidth: 8,
        scrollBarsInset: false,
        disablePan: false,
        onTap: (pt, ev) => { },
        onDoubleTap: (pt, ev) => { }
        // onSwipe: (pt, ev, direction) => { }
    };

    private _bounds: any;
    private _contentView: any;
    private _contentScroll: any;
    private _contentZoom: any;
    private _page: any;
    private _pageWidth: number;
    private _pageHeight: number;
    private _debug: any;
    private _scrollBars: boolean = false;

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
    private _scrollBarElements: any = {
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
    private _scrollBounds: any; // bounding rect
    private _scrollRect: any; // bounding rect
    private _scrollParams: any = {
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
    private _scrollEvents: any = false;
    private _scrollContainer: any;
    private _isScrolling: boolean = false;
    private _eventScrollWheelTimer: any;

    private _init: boolean = false;
    private _initInterval: any;
    private _initScale: boolean = false;

    // Hammer Libary
    private _mc: any;

    constructor(options: any) {

        if (window.Hammer === undefined) {
            throw "Hammer JS not found";
        }

        // setup options
        for (let i in options) {
            if (options.hasOwnProperty(i)) {
                this._options[i] = options[i];
            }
        }

        // dom elements
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

    public init(scale: any): void {
        this._init = false;
        this._initInterval = setInterval(this.initInterval, 10);
        this._initScale = scale;
        this.initInterval();
    }

    public initInterval = () => {
        if (this._options.pageHasChildren && !this._page.childNodes.length) {
            return;
        }
        clearInterval(this._initInterval);
        this._initInterval = undefined;
        this.setupContainers();
        if (this._initScale) {
            this.setMaxMinScale();
        }
        this.setupScrollbars();
        this.setupTouch();
        this.update();
        if (this._initScale) {
            this.updateContentScroll();
        }
        this._init = true;
    };

    public refresh(): void {
        this.destroy();
        this.init(this._options.zoomFit);
    }

    public zoom(direction: string): void {
        if (direction === "in") {
            this._scale.current += this._options.zoomIncrements;
        } else {
            this._scale.current -= this._options.zoomIncrements;
        }
        this._scale.last = this._scale.current;
        this.update();
    }

    public zoomFit(value: boolean): void {
        this._options.zoomFit = value;
        if (!value) {
            this._scale.last = this._scale.current = 1;
            this._scale.max = 2;
            this._scale.min = .5;
            this._scrollBars = true;
        }
        this.refresh();
    }

    public destroy(): void {
        try {
            // this._contentZoom.style = "";
            // this._contentScroll.style = "";
        } catch (e) {
            ;
        }
        // remove any previous listeners
        try {
            window.removeEventListener("mousemove", this._eventScrollMouseMove, false);
            window.removeEventListener("mouseup", this._eventScrollMouseMove, false);
            this._contentView.removeEventListener("mousewheel", this._eventScrollWheel, false);
            this._contentView.removeEventListener("scroll", this._eventScroll, false);
            this._scrollEvents = false;
        } catch (e) {
            ;
        }
        try {
            if (this._scrollContainer) {
                this._scrollContainer.parentNode.removeChild(this._scrollContainer);
                this._scrollContainer = undefined;
            }
        } catch (e) {
            ;
        }
    }

    private setupScrollbars(): void {

        this._scrollBars = false;
        if (this._options.zoomFit === "contain" || this._options.zoomFit === true || !this._options.scrollBars) {
            return;
        }

        this._scrollBounds = this.getBoundingClientRect(this._contentView.getBoundingClientRect());
        this._scrollRect = this.getBoundingClientRect(this._contentScroll.getBoundingClientRect());
        this._scrollRect.height = this._scrollRect.height * this._scale.current;
        this._scrollRect.width = this._scrollRect.width * this._scale.current;

        // check if scrollbars requried
        if (this._scrollBounds.height < this._scrollRect.height || this._scrollBounds.width < this._scrollRect.width) {
            this._scrollBars = true;
        }
        if (!this._scrollBars) {
            return;
        }

        let showAxis: any = [];
        if (this._scrollBounds.height < this._scrollRect.height) {
            showAxis.push("y");
        }
        if (this._scrollBounds.width < this._scrollRect.width) {
            showAxis.push("x");
        }
        this._scrollEvents = showAxis;

        for (let element in this._scrollBarElements) {

            if (!this._scrollBarElements.hasOwnProperty(element)) {
                continue;
            }

            let axis: string = this._scrollBarElements[element].axis;
            // if (showAxis.indexOf(axis) === -1) {
            //     continue;
            // }

            // check if element exists
            // let e: any = this._bounds.querySelector(`.${this._options.prefix}-${this._scrollBarElements[element].className}`);

            // create element if doesn't exist
            // if (!e) {

            let e: any = document.createElement("div");
            e.className = `${this._options.prefix} ${this._options.prefix}-${this._scrollBarElements[element].className}`;
            e.style.position = "absolute";
            e.style.zIndex = this._scrollBarElements[element].zIndex;

            // allow drag
            e.addEventListener("mousedown", (evt: any) => {
                if (this._scrollBarElements[element].type === "scroller") {
                    this._scrollBarElements[element].pos.mouseX = evt.x;
                    this._scrollBarElements[element].pos.mouseY = evt.y;
                    this._scrollBarElements[element].pos.x = parseFloat(this._scrollBarElements[element].element.style.left);
                    this._scrollBarElements[element].pos.y = parseFloat(this._scrollBarElements[element].element.style.top);
                    this._scrollBarElements[element].drag = true;
                    // this._eventScrollMouseMove(evt);
                    evt.stopPropagation();
                } else {
                    this.onClickScrollbar(this._scrollBarElements[element], evt);
                }
            });

            // this._bounds.appendChild(e);
            // }

            // assign element
            this._scrollBarElements[element].element = e;

            // show or hide bars
            // let params: any = this._scrollParams[axis];
            let className: string = showAxis.indexOf(axis) !== -1 ? `${this._options.prefix}-show` : `${this._options.prefix}-hide`;
            e.className = this.removeClassname(e.className, `${this._options.prefix}-show`);
            e.className = this.removeClassname(e.className, `${this._options.prefix}-hide`);
            e.className = this.addClassname(e.className, className);

            let offset: number = 0;
            if (this._options.scrollBarsInset) {
                offset = this._options.scrollBarWidth;
            }

            // set size of handles
            switch (this._scrollBarElements[element].type) {

                case "scroller":
                    let xWidth: number = Math.floor((this._scrollBounds.width / this._scrollRect.width) * this._scrollBounds.width);
                    let yHeight: number = Math.floor((this._scrollBounds.height / this._scrollRect.height) * this._scrollBounds.height);
                    if (showAxis.indexOf("x") === -1) {
                        xWidth = 0;
                    }
                    if (showAxis.indexOf("y") === -1) {
                        yHeight = 0;
                    }
                    this._scrollBarElements[element].length = axis === "x" ? xWidth : yHeight;
                    e.style.left = "0px";
                    e.style.top = "0px";
                    e.style.width = axis === "x" ? `${xWidth}px` : `${this._options.scrollBarWidth}px`;
                    e.style.height = axis === "x" ? `${this._options.scrollBarWidth}px` : `${yHeight}px`;
                    break;
                // bar
                default:
                    if (axis === "x") {
                        e.style.left = `${this._contentView.offsetLeft}px`;
                        e.style.top = `${(this._contentView.offsetTop + this._scrollBounds.height + offset)}px`;
                    } else {
                        e.style.left = `${(this._contentView.offsetLeft + this._scrollBounds.width + offset)}px`;
                        e.style.top = `${this._contentView.offsetTop}px`;
                    }
                    e.style.width = axis === "x" ? `${this._scrollBounds.width}px` : `${this._options.scrollBarWidth}px`;
                    e.style.height = axis === "x" ? `${this._options.scrollBarWidth}px` : `${this._scrollBounds.height}px`;
                    break;
            }

        }

        // add to dom
        if (!this._scrollContainer) {
            this._scrollContainer = document.createElement("div");
            this._scrollBarElements.trackX.element.appendChild(this._scrollBarElements.scrollX.element);
            this._scrollBarElements.trackY.element.appendChild(this._scrollBarElements.scrollY.element);
            this._scrollContainer.appendChild(this._scrollBarElements.trackX.element);
            this._scrollContainer.appendChild(this._scrollBarElements.trackY.element);
        }
        this._bounds.appendChild(this._scrollContainer);

        // drag
        window.addEventListener("mousemove", this._eventScrollMouseMove, false);
        // stop drag
        window.addEventListener("mouseup", this._eventScrollMouseUp, false);
        // mouse wheel
        this._contentView.addEventListener("mousewheel", this._eventScrollWheel, false);

    }

    private setupContainers(): void {
        this._contentView.style.overflow = "hidden";
        this._contentView.addEventListener("scroll", this._eventScroll, false);
        this._contentScroll.style.width = `${this._page.clientWidth}px`;
        this._contentScroll.style.height = `${this._page.clientHeight}px`;
        this._contentZoom.style.transformOrigin = "0 0";
    }

    private setupTouch(): void {
        if (this._mc) {
            this._mc.destroy();
        }
        // touch library
        this._mc = new Hammer(this._contentView);
        // let swipe: any = new Hammer.Swipe();
        let pan: any = new Hammer.Pan();
        let tap: any = new Hammer.Tap({ event: "singletap" });
        let doubleTap: any = new Hammer.Tap({ event: "doubletap", taps: 2 });
        doubleTap.recognizeWith(tap);
        let pinch: any = new Hammer.Pinch();
        this._mc.add([pan, doubleTap, pinch]);

        // event listeners
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
    }

    private onClickScrollbar(element: any, evt: any) {
        console.log('onClickScrollbar', evt);
        let scroller: any = this._scrollBarElements[`scroll${element.axis.toUpperCase()}`];
        let params: any = this._scrollParams[element.axis];
        let scrollerPos: number = parseFloat(scroller.element.style[params.dir]) + scroller.length;
        let delta: boolean = evt[element.axis] > scrollerPos;
        this._pos[element.axis].current = this._pos[element.axis].last = delta ? this._scrollRect[params.unit] - this._scrollBounds[params.unit] : 0;
        this.update();
    }

    // catche external trigger
    private _eventScroll = (evt: any) => {
        if (!this._isScrolling) {
            this._pos.x.current = this._contentView.scrollLeft;
            this._pos.y.current = this._contentView.scrollTop;
            this.update();
        }
    };

    private _eventScrollWheel = (evt: any) => {
        if (!this._scrollBars || !this._scrollEvents) {
            return;
        }
        this._isScrolling = true;
        if (this._eventScrollWheelTimer) {
            clearTimeout(this._eventScrollWheelTimer);
            this._eventScrollWheelTimer = undefined;
        }
        let delta: number = Math.max(-1, Math.min(1, (evt.wheelDelta || -evt.detail)));
        let axis: string = this._scrollEvents.indexOf("y") > -1 ? "y" : "x";
        let dir: string = this._scrollParams[axis].dir.charAt(0).toUpperCase() + this._scrollParams[axis].dir.slice(1);
        let scroll: string = `scroll${dir}`;
        this._pos[axis].current += 20 * delta * -1;
        this.update();
        this._pos[axis].current = this._pos[axis].last = this._contentView[scroll];
        this._eventScrollWheelTimer = setTimeout(() => {
            this._isScrolling = false;
        }, 50);
        evt.preventDefault();
    };

    private _eventScrollMouseMove = (evt: any) => {
        this._isScrolling = true;
        for (let e in this._scrollBarElements) {

            if (!this._scrollBarElements.hasOwnProperty(e)) {
                continue;
            }

            let scroller: any = this._scrollBarElements[e];

            if (scroller.drag !== true) {
                continue;
            }

            /*
            scroller = {
                axis: "y",
                element: null,
                type: "scroller",
                className: "scroll-y",
                zIndex: 100,
                drag: false,
                pos: {
                    x: left,
                    y: top,
                },
            }
            paramsAxis = {
                parent: "trackY",
                element: "scrollY",
                pos: "mouseY",
                unit: "height",
                dir: "top",
            },             
            */

            let paramsAxis: any = this._scrollParams[scroller.axis];

            let offset: number = evt[scroller.axis] - scroller.pos[paramsAxis.pos];
            let pos: number = scroller.pos[scroller.axis] + offset;

            if (pos < 0) {
                pos = 0;
            }

            let distance: number = parseFloat(scroller.element.style[paramsAxis.unit]);
            let distanceRemainder: number = this._scrollBounds[paramsAxis.unit] - distance;
            let maxOffset: number = this._scrollBounds[paramsAxis.dir] + distanceRemainder;

            if (pos > maxOffset) {
                pos = maxOffset;
            }
            // scroller.element.style[paramsAxis.dir] = `${pos}px`;
            let scroll: number = pos; // - this._scrollBounds[paramsAxis.dir];
            this._pos[scroller.axis].current = this._pos[scroller.axis].last = scroll * (this._scrollRect[paramsAxis.unit] / this._scrollBounds[paramsAxis.unit]);
            this.update();
            console.log('mouse', 'pos', pos, 'distance', distance, 'scroll', scroll);

        }
    };

    private _eventScrollMouseUp = (evt: any) => {
        this._isScrolling = false;
        for (let e in this._scrollBarElements) {
            if (!this._scrollBarElements.hasOwnProperty(e)) {
                continue;
            }
            this._scrollBarElements[e].drag = false;
        }
    };

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
            this._options.onTap(this, ev);
        } else if (ev.tapCount === 2) {
            this._options.onDoubleTap(this, ev);
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
        this._contentView.scrollLeft = this._pos.x.current;
        this._contentView.scrollTop = this._pos.y.current;
        this._contentZoom.style.transform = this._options.zoomCss ? `translateZ(0px)` : `translateZ(0px) scale(${this._scale.current})`;
        if (this._options.zoomCss) {
            this._contentZoom.style.zoom = `${this._scale.current * 100}%`;
        }
        this.updateScrollbars();

    }

    private updateScrollbars(): void {

        if (!this._scrollBars || !this._scrollEvents) {
            return;
        }

        // this._scrollBarElements.trackX.element.style.left = `${(this._contentView.scrollLeft)}px`;
        // this._scrollBarElements.trackX.element.style.top = `${(this._contentView.scrollTop + this._scrollBounds.height - this._options.scrollBarWidth)}px`;

        // this._scrollBarElements.trackY.element.style.left = `${(this._contentView.scrollLeft + this._scrollBounds.width - this._options.scrollBarWidth)}px`;
        // this._scrollBarElements.trackY.element.style.top = `${(this._contentView.scrollTop)}px`;

        for (let e in this._scrollParams) {

            if (!this._scrollParams.hasOwnProperty(e)) {
                continue;
            }

            let param: any = this._scrollParams[e];

            let maxScroll: number = this._scrollRect[param.unit] - this._scrollBounds[param.unit];
            let scrollDistance: number = this._scrollBounds[param.unit] - this._scrollBarElements[param.element].length;
            let pos: number = this._pos[e].current * scrollDistance / maxScroll; // + this._scrollBounds[param.dir];

            // this._scrollBarElements[param.element.parent].element.style[param.dir] = `${pos}px`;

            this._scrollBarElements[param.element].element.style[param.dir] = `${pos}px`;
        }

    }

    private updateContentScroll(): void {
        this._contentScroll.style.width = `${Math.ceil(this._scale.width)}px`;
        this._contentScroll.style.height = `${Math.ceil(this._scale.height)}px`;
    }

    private setMaxMinScale(scale: boolean): void {

        let scaleWidth: number = this._contentView.clientWidth / this._page.clientWidth;
        let scaleHeight: number = this._contentView.clientHeight / this._page.clientHeight;
        let scaleBy: number = (scaleHeight < scaleWidth) ? scaleHeight : scaleWidth;
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

        let maxLeft: number = pageWidth - this._contentView.clientWidth;
        let maxTop: number = pageHeight - this._contentView.clientHeight;

        let minLeft: number = 0; // (pageWidth - this._bounds.clientWidth) / 2;
        let minTop: number = 0; // (pageHeight - this._bounds.clientHeight) / 2;

        this._pos.x.max = maxLeft;
        this._pos.x.min = minLeft;
        this._pos.y.max = maxTop;
        this._pos.y.min = minTop;

        if (pageWidth > this._contentView.clientWidth) {
            if (this._pos.x.current > maxLeft) {
                this._pos.x.current = maxLeft;
            } else if (this._pos.x.current < minLeft) {
                this._pos.x.current = minLeft;
            }
        } else {
            this._pos.x.current = minLeft;
        }

        if (pageHeight > this._contentView.clientHeight) {
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
            this._debug.innerHTML = `
                <table>
                    <tr>
                        <td width="100">x</td>
                        <td align="right">${this._pos.x.current.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>y</td>
                        <td align="right">${this._pos.y.current.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>width</td>
                        <td align="right">${pageWidth.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>height</td>
                        <td align="right">${pageHeight.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>scale</td>
                        <td align="right">${this._scale.last.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>bounds height</td>
                        <td align="right">${this._contentView.clientHeight.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>bounds width</td>
                        <td align="right">${this._contentView.clientWidth.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>page height</td>
                        <td align="right">${this._page.clientHeight.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>page width</td>
                        <td align="right">${this._page.clientWidth.toFixed(2)}</td>
                    </tr>
                </table>
            `;
        }

    }

    private addClassname(currentName: string, name: string): string {
        let str: string = this.removeClassname(currentName, name);
        return `${str} ${name}`.trim();
    }

    private removeClassname(currentName: string, name: string): string {
        let exp: any = new RegExp(`${name}`, "ig");
        return currentName.replace(exp, "").trim();
    }

    private getBoundingClientRect(rect: any): any {
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
    }


}

