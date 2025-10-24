const utils = function(){
    var that = {}

    that.get = function(url, param, callback) {
        let dataStr = '';
        Object.keys(param).forEach(key => {
            dataStr += key + '=' + encodeURIComponent(param[key]) + '&';
        })
        if (dataStr !== '') {
            dataStr = dataStr.substr(0, dataStr.lastIndexOf('&'));
            url = url + '?' + dataStr;
        }

        let xhr = cc.loader.getXMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.setRequestHeader("Content-Type","text/plain;charset=UTF-8");
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                let response = xhr.responseText;
                if (xhr.status >= 200 && xhr.status < 300) {
                    let httpStatus = xhr.statusText;
                    callback(true, JSON.parse(response));
                }else{
                    callback(false, response);
                }
            }
        };
        xhr.send();
    }
    that.post = function(url, param, callback){

        var xhr = cc.loader.getXMLHttpRequest();
        xhr.open("POST", url, true);
        xhr.setRequestHeader("Content-Type","application/json");
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                let response = xhr.responseText;
                if (xhr.status >= 200 && xhr.status < 300) {
                    callback(true, JSON.parse(response));
                }else{
                    callback(false, response);
                }
            }
        };
        xhr.send(JSON.stringify(param));
    }

    /**
     * 截取字符串
     * 
     */
    that.subStringResult = function(str, len){
        if(!str) return "";
        var newLength = 0; 
        var newStr = ""; 
        var chineseRegex = /[^\x00-\xff]/g; 
        var singleChar = ""; 
        var strLength = str.replace(chineseRegex,"**").length; 
        for(var i = 0;i < strLength;i++) 
        { 
            singleChar = str.charAt(i).toString(); 
            if(singleChar.match(chineseRegex) != null) 
            { 
                newLength += 2; 
            }     
            else 
            { 
                newLength++; 
            } 
            if(newLength > len) 
            { 
                break; 
            } 
            newStr += singleChar; 
        } 
        
        if(strLength > len) 
        { 
            newStr += "..."; 
        }
        return newStr;
    }

    return that;
}

export default utils