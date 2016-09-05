import Promise from 'bluebird';

function attach (path) {
    let comps = path.split('/');
    if (comps[0].length === 0) {
        comps = comps.slice(1);
    }
    const uid = comps[0];
    const gid = comps[1];
    const lid = comps[2];
    if(!!uid && !!gid && !!lid){
        return this.binder.attachLayerToGroup(uid, gid, lid);
    }
    return Promise.reject('wrong argument, expecting /user_id/group_id/layer_id');
}


export default {
    name: 'attach',
    command: attach
};
