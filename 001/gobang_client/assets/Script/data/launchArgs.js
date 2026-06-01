const launchArgs = {};

launchArgs._decode = function(value) {
    try {
        return decodeURIComponent(String(value || '').replace(/\+/g, ' '));
    } catch (err) {
        return value || '';
    }
}

launchArgs._getQuery = function(rawUrl) {
    var url = rawUrl || '';
    var hashIndex = url.indexOf('#');
    var beforeHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
    var hash = hashIndex >= 0 ? url.slice(hashIndex + 1) : '';
    var queryIndex = beforeHash.indexOf('?');
    if(queryIndex >= 0){
        return beforeHash.slice(queryIndex + 1);
    }
    var hashQueryIndex = hash.indexOf('?');
    if(hashQueryIndex >= 0){
        return hash.slice(hashQueryIndex + 1);
    }
    return '';
}

launchArgs.parse = function(rawUrl) {
    var query = launchArgs._getQuery(rawUrl);
    var field = {};
    if(!query){
        return field;
    }
    var hashIndex = query.indexOf('#');
    if(hashIndex >= 0){
        query = query.slice(0, hashIndex);
    }
    var params = query.split('&');
    for (var i = 0; i < params.length; i++) {
        if(!params[i]){
            continue;
        }
        var eqIndex = params[i].indexOf('=');
        var key = eqIndex >= 0 ? params[i].slice(0, eqIndex) : params[i];
        var value = eqIndex >= 0 ? params[i].slice(eqIndex + 1) : '';
        key = launchArgs._decode(key);
        if(key){
            field[key] = launchArgs._decode(value);
        }
    }
    return field;
}

launchArgs.hasRequiredLoginArgs = function(args) {
    return !!(args && args.uid && args.room);
}

launchArgs.createDebugFallbackArgs = function(now) {
    var id = now || Date.now();
    return {
        uid: 'guest_' + id,
        name: '游客',
        avatorUrl: '',
        score: '1000',
        room: 'guest_' + id,
        play_mode: '1',
        play_count: '1',
        robot: '1',
        auto_ready: '1',
    };
}

export default launchArgs;
