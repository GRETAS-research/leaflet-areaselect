L.AreaSelect = L.Class.extend({
    includes: L.Evented.prototype,

    options: {
        width: 200,
        height: 300,
        minWidth: 30,
        minHeight: 30,
        minHorizontalSpacing: 30,
        minVerticalSpacing: 30,
        keepAspectRatio: false,
    },

    initialize: function (options) {
        L.Util.setOptions(this, options);

        this._width = this.options.width;
        this._height = this.options.height;
    },

    addTo: function (map) {
        this.map = map;
        if (this._container) {
            this.map._controlContainer.appendChild(this._container);
        } else {
            this._createElements();
        }
        this.map.on("move", this._onMapChange, this);
        this.map.on("zoom", this._onMapChange, this);
        this.map.on("moveend", this._onMapChanged, this);
        this.map.on("zoomend", this._onMapChanged, this);
        this.map.on("resize", this._onMapResize, this);

        this._render();
        return this;
    },

    setBounds: function (bounds) {
        const nwPx = this.map.latLngToContainerPoint(L.latLng(bounds.getNorth(), bounds.getWest()));
        const sePx = this.map.latLngToContainerPoint(L.latLng(bounds.getSouth(), bounds.getEast()));

        this._width = sePx.x - nwPx.x;
        this._height = sePx.y - nwPx.y;
        this._render();
    },

    getBounds: function () {
        const size = this.map.getSize();
        const topRight = new L.Point();
        const bottomLeft = new L.Point();

        bottomLeft.x = Math.round((size.x - this._width) / 2);
        topRight.y = Math.round((size.y - this._height) / 2);
        topRight.x = size.x - bottomLeft.x;
        bottomLeft.y = size.y - topRight.y;

        const sw = this.map.containerPointToLatLng(bottomLeft);
        const ne = this.map.containerPointToLatLng(topRight);

        return new L.LatLngBounds(sw, ne);
    },

    getBBoxCoordinates: function () {
        const size = this.map.getSize();

        const topRight = new L.Point();
        const bottomLeft = new L.Point();
        const topLeft = new L.Point();
        const bottomRight = new L.Point();

        bottomLeft.x = Math.round((size.x - this._width) / 2);
        topRight.y = Math.round((size.y - this._height) / 2);
        topRight.x = size.x - bottomLeft.x;
        bottomLeft.y = size.y - topRight.y;

        topLeft.x = bottomLeft.x;
        topLeft.y = topRight.y;
        bottomRight.x = topRight.x;
        bottomRight.y = bottomLeft.y;

        const coordinates = [
            { sw: this.map.containerPointToLatLng(bottomLeft) },
            { nw: this.map.containerPointToLatLng(topLeft) },
            { ne: this.map.containerPointToLatLng(topRight) },
            { se: this.map.containerPointToLatLng(bottomRight) },
        ];

        return coordinates;
    },

    remove: function () {
        this.map.off("move", this._onMapChange);
        this.map.off("zoom", this._onMapChange);
        this.map.off("moveend", this._onMapChanged);
        this.map.off("zoomend", this._onMapChanged);
        this.map.off("resize", this._onMapResize);

        this._container.parentNode.removeChild(this._container);
    },

    setDimensions: function (width, height) {
        const wasChanged = this._width != width && this._height != height;
        this._width = width;
        this._height = height;

        if (wasChanged) {
            this._render();
            this.fire("change");
            this.fire("changed");
        }
    },

    _createElements: function () {
        if (!!this._container) {
            return;
        }

        this._container = L.DomUtil.create("div", "leaflet-areaselect-container", this.map._controlContainer);
        this._topShade = L.DomUtil.create("div", "leaflet-areaselect-shade leaflet-control", this._container);
        this._bottomShade = L.DomUtil.create("div", "leaflet-areaselect-shade leaflet-control", this._container);
        this._leftShade = L.DomUtil.create("div", "leaflet-areaselect-shade leaflet-control", this._container);
        this._rightShade = L.DomUtil.create("div", "leaflet-areaselect-shade leaflet-control", this._container);

        this._nwHandle = L.DomUtil.create("div", "leaflet-areaselect-handle leaflet-control", this._container);
        this._swHandle = L.DomUtil.create("div", "leaflet-areaselect-handle leaflet-control", this._container);
        this._neHandle = L.DomUtil.create("div", "leaflet-areaselect-handle leaflet-control", this._container);
        this._seHandle = L.DomUtil.create("div", "leaflet-areaselect-handle leaflet-control", this._container);

        this._setUpHandlerEvents(this._nwHandle);
        this._setUpHandlerEvents(this._neHandle, -1, 1);
        this._setUpHandlerEvents(this._swHandle, 1, -1);
        this._setUpHandlerEvents(this._seHandle, -1, -1);
    },

    _setUpHandlerEvents: function (handle, xMod, yMod) {
        xMod = xMod || 1;
        yMod = yMod || 1;

        const self = this;
        function onPointerDown(event) {
            event.stopPropagation();
            event.preventDefault();
            self.map.dragging.disable();
            L.DomEvent.removeListener(this, "onpointerdown", onPointerDown);
            let curX = event.pageX;
            let curY = event.pageY;
            const ratio = self._width / self._height;
            const size = self.map.getSize();
            const mapContainer = self.map.getContainer();

            function onPointerMove(event) {
                if (self.options.keepAspectRatio) {
                    const maxHeight =
                        (self._height >= self._width ? size.y : size.y * (1 / ratio)) -
                        Math.max(self.options.minVerticalSpacing, self.options.minHorizontalSpacing);
                    self._height += (curY - event.pageY) * 2 * yMod;
                    self._height = Math.max(self.options.minHeight, self.options.minWidth, self._height);
                    self._height = Math.min(maxHeight, self._height);
                    self._width = self._height * ratio;
                } else {
                    self._width += (curX - event.pageX) * 2 * xMod;
                    self._height += (curY - event.pageY) * 2 * yMod;
                    self._width = Math.max(self.options.minWidth, self._width);
                    self._height = Math.max(self.options.minHeight, self._height);
                    self._width = Math.min(size.x - self.options.minHorizontalSpacing, self._width);
                    self._height = Math.min(size.y - self.options.minVerticalSpacing, self._height);
                }

                curX = event.pageX;
                curY = event.pageY;
                self._render();
                self.fire("change");
            }
            function onPointerUp(event) {
                self.map.dragging.enable();
                L.DomEvent.removeListener(mapContainer, "pointerup", onPointerUp);
                L.DomEvent.removeListener(mapContainer, "pointermove", onPointerMove);
                L.DomEvent.addListener(handle, "pointerdown", onPointerDown);
                self.fire("changed");
            }
            L.DomEvent.addListener(mapContainer, "pointermove", onPointerMove);
            L.DomEvent.addListener(mapContainer, "pointerup", onPointerUp);
        }
        L.DomEvent.addListener(handle, "pointerdown", onPointerDown);
    },

    _onMapResize: function () {
        this._render();
    },

    _onMapChange: function () {
        this.fire("change");
    },

    _onMapChanged: function () {
        this.fire("changed");
    },

    _render: function () {
        const size = this.map.getSize();
        const handleOffset = Math.round(this._nwHandle.offsetWidth / 2);

        const topBottomWidth = size.x;
        const topBottomHeight = Math.round((size.y - this._height) / 2);
        const leftRightWidth = Math.round((size.x - this._width) / 2);
        const leftRightHeight = size.y - topBottomHeight * 2;

        function updateElement(element, dimension) {
            element.style.width = dimension.width + "px";
            element.style.height = dimension.height + "px";
            element.style.top = dimension.top + "px";
            element.style.left = dimension.left + "px";
            element.style.bottom = dimension.bottom + "px";
            element.style.right = dimension.right + "px";
        }

        updateElement(this._topShade, {
            width: topBottomWidth,
            height: topBottomHeight,
            top: 0,
            left: 0,
        });
        updateElement(this._bottomShade, {
            width: topBottomWidth,
            height: topBottomHeight,
            top: size.y - topBottomHeight,
            left: 0,
        });
        updateElement(this._leftShade, {
            width: leftRightWidth,
            height: leftRightHeight,
            top: topBottomHeight,
            left: 0,
        });
        updateElement(this._rightShade, {
            width: leftRightWidth,
            height: leftRightHeight,
            top: topBottomHeight,
            left: size.x - leftRightWidth,
        });

        updateElement(this._nwHandle, { left: leftRightWidth - handleOffset, top: topBottomHeight - 7 });
        updateElement(this._neHandle, { right: leftRightWidth - handleOffset, top: topBottomHeight - 7 });
        updateElement(this._swHandle, { left: leftRightWidth - handleOffset, bottom: topBottomHeight - 7 });
        updateElement(this._seHandle, { right: leftRightWidth - handleOffset, bottom: topBottomHeight - 7 });
    },
});

L.areaSelect = function (options) {
    return new L.AreaSelect(options);
};
