import _ from 'underscore';

function getGeometry () {
    const self = this;
    const args = _.toArray(arguments);
    const format = args.shift();
    const sys = self.sys;
    const geom = self.data.getGeometry();

    sys.stdout.write(JSON.stringify(geom.toGeoJSON()));
    return self.end(geom);
}


export default {
    name: 'getGeometry',
    command: getGeometry
};
