'use strict';

var extractBBox = function (ar, obj) {
  if (obj && obj.bbox) {
    return {
      leaf: obj,
      x: obj.bbox[0],
      y: obj.bbox[1],
      w: obj.bbox[2] - obj.bbox[0],
      h: obj.bbox[3] - obj.bbox[1]
    };
  }
  var len = ar.length;
  var i = 0;
  var a = new Array(len);
  while (i < len) {
    a[i] = [ar[i][0], ar[i][1]];
    i++;
  }
  var first = a[0];
  len = a.length;
  i = 1;
  var temp = {
    min: [].concat(first),
    max: [].concat(first)
  };
  while (i < len) {
    if (a[i][0] < temp.min[0]) {
      temp.min[0] = a[i][0];
    }
    else if (a[i][0] > temp.max[0]) {
      temp.max[0] = a[i][0];
    }
    if (a[i][1] < temp.min[1]) {
      temp.min[1] = a[i][1];
    }
    else if (a[i][1] > temp.max[1]) {
      temp.max[1] = a[i][1];
    }
    i++;
  }
  var out = {
    x: temp.min[0],
    y: temp.min[1],
    w: (temp.max[0] - temp.min[0]),
    h: (temp.max[1] - temp.min[1])
  };
  if (obj) {
    out.leaf = obj;
  }
  return out;
};

var geoJSON = {};

geoJSON.point = function (obj, self) {
  return {
    x: obj.geometry.coordinates[0],
    y: obj.geometry.coordinates[1],
    w: 0,
    h: 0,
    leaf: obj
  };
};

geoJSON.multiPointLineString = function (obj, self) {
  return extractBBox(obj.geometry.coordinates, obj);
};

geoJSON.multiLineStringPolygon = function (obj, self) {
  return extractBBox(Array.prototype.concat.apply([], obj.geometry.coordinates));
};

geoJSON.multiPolygon = function (obj, self) {
  return extractBBox(Array.prototype.concat.apply([], Array.prototype.concat.apply([], obj.geometry.coordinates)), obj);
};

module.exports = exports = function (prelim) {
  var that = this;
  var features, feature;
  if (Array.isArray(prelim)) {
    features = prelim.slice();
  }
  else if (prelim.features && Array.isArray(prelim.features)) {
    features = prelim.features.slice();
  }
  else if (prelim instanceof Object) {
    features = [prelim];
  } else {
    throw new Error('this isn\'t what we\'re looking for');
  }
  var len = features.length;
  var i = 0;
  var bbox = undefined;
  while (i < len) {
    feature = features[i];
    if (feature.type === 'Feature') {
      switch (feature.geometry.type) {
      case 'Point':
        bbox = geoJSON.point(feature, that);
        break;
      case 'MultiPoint':
        bbox = geoJSON.multiPointLineString(feature, that);
        break;
      case 'LineString':
        bbox = geoJSON.multiPointLineString(feature, that);
        break;
      case 'MultiLineString':
        bbox = geoJSON.multiLineStringPolygon(feature, that);
        break;
      case 'Polygon':
        bbox = geoJSON.multiLineStringPolygon(feature, that);
        break;
      case 'MultiPolygon':
        bbox = geoJSON.multiPolygon(feature, that);
        break;
      case 'GeometryCollection':
        throw new Error('GeometryCollection not implemented');
        break;
      }
    }
    i++;
  }
  return bbox;
};
