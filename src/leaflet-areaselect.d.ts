import * as L from "leaflet";

declare module "leaflet" {
  function areaSelect(box: AreaSelectOptions): AreaSelect;

  type AreaSelectOptions = {
    width: number;
    height: number;
    minWidth: number;
    minHeight: number;
    minHorizontalSpacing: number;
    minVerticalSpacing: number;
    keepAspectRatio: boolean;
  };

  type Corners = {
    sw: L.LatLng;
    nw: L.LatLng;
    ne: L.LatLng;
    se: L.LatLng;
  };

  class AreaSelect extends L.Evented {
    constructor(options?: Partial<AreaSelectOptions>);
    addTo(map: L.Map): L.Map;
    remove(): void;
    setBounds(bounds: L.LatLngBounds): void;
    getBounds(): L.LatLngBounds;
    setDimensions(width: number, height: number): void;
    getBBoxCoordinates(): Corners;
  }
}
