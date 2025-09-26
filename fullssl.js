Java.perform(function() {
    console.log("[🌐] Full Network Traffic Monitor Started");
    
    // Tüm HTTP/HTTPS trafiğini yakala
    monitorAllHttpTraffic();
    monitorAllHttpsTraffic();
    monitorOkHttpTraffic();
    monitorWebViewTraffic();
    monitorUrlConnections();
    
    console.log("[✅] All traffic monitors installed");
});

function monitorAllHttpTraffic() {
    try {
        var URL = Java.use("java.net.URL");
        var HttpURLConnection = Java.use("java.net.HttpURLConnection");
        
        // URL.openConnection için
        URL.openConnection.overload().implementation = function() {
            var connection = this.openConnection();
            var url = this.toString();
            
            if (url.startsWith("http://")) {
                console.log("[📡] HTTP Request: " + url);
                logConnectionDetails(connection);
            }
            
            return connection;
        };
        
        // HttpURLConnection.connect için
        HttpURLConnection.connect.implementation = function() {
            var url = this.getURL().toString();
            if (url.startsWith("http://")) {
                console.log("[🔗] HTTP Connect: " + url);
            }
            return this.connect();
        };
        
    } catch (e) {
        console.log("[⚠️] HTTP monitor error: " + e);
    }
}

function monitorAllHttpsTraffic() {
    try {
        var HttpsURLConnection = Java.use("javax.net.ssl.HttpsURLConnection");
        
        HttpsURLConnection.connect.implementation = function() {
            var url = this.getURL().toString();
            console.log("[🔒] HTTPS Connect: " + url);
            
            // SSL sertifika bilgileri
            try {
                var certs = this.getServerCertificates();
                if (certs && certs.length > 0) {
                    var cert = certs[0];
                    var subject = cert.getSubjectDN().getName();
                    console.log("[📜] SSL Cert: " + subject.split(",")[0]);
                }
            } catch (e) {}
            
            return this.connect();
        };
        
        // HTTPS header'ları
        HttpsURLConnection.getHeaderField.overload('int').implementation = function(index) {
            var value = this.getHeaderField(index);
            var key = this.getHeaderFieldKey(index);
            if (key && value && (key.toLowerCase().includes("auth") || key.toLowerCase().includes("token"))) {
                console.log("[🔑] Header: " + key + " = " + value.substring(0, 50) + "...");
            }
            return value;
        };
        
    } catch (e) {
        console.log("[⚠️] HTTPS monitor error: " + e);
    }
}

function monitorOkHttpTraffic() {
    try {
        var OkHttpClient = Java.use("okhttp3.OkHttpClient");
        var Request = Java.use("okhttp3.Request");
        var Response = Java.use("okhttp3.Response");
        
        // Tüm OkHTTP isteklerini yakala
        OkHttpClient.newCall.implementation = function(request) {
            var url = request.url().toString();
            var method = request.method();
            
            console.log("[🚀] OkHTTP: " + method + " " + url);
            
            // Request headers
            try {
                var headers = request.headers();
                for (var i = 0; i < headers.size(); i++) {
                    var name = headers.name(i);
                    var value = headers.value(i);
                    if (name.toLowerCase().includes("auth") || name.toLowerCase().includes("token")) {
                        console.log("[📋] Request Header: " + name + " = " + value.substring(0, 30) + "...");
                    }
                }
            } catch (e) {}
            
            // Request body
            try {
                var body = request.body();
                if (body) {
                    var buffer = Java.use("okhttp3.Buffer").$new();
                    body.writeTo(buffer);
                    var bodyStr = buffer.readUtf8();
                    if (bodyStr && bodyStr.length > 0) {
                        console.log("[📦] Request Body: " + bodyStr.substring(0, 200) + 
                                   (bodyStr.length > 200 ? "..." : ""));
                    }
                }
            } catch (e) {}
            
            return this.newCall(request);
        };
        
        // Response'ları da yakala
        var Call = Java.use("okhttp3.Call");
        var originalEnqueue = Call.enqueue;
        
        Call.enqueue.implementation = function(callback) {
            var wrappedCallback = Java.registerClass({
                name: 'com.example.TrafficCallback',
                implements: [Java.use('okhttp3.Callback')],
                methods: {
                    onFailure: function(call, e) {
                        console.log("[❌] Request failed: " + e.getMessage());
                        callback.onFailure(call, e);
                    },
                    onResponse: function(call, response) {
                        var url = response.request().url().toString();
                        var code = response.code();
                        
                        console.log("[✅] Response: " + code + " " + url);
                        
                        // Response body
                        try {
                            var body = response.body().string();
                            console.log("[📦] Response Body: " + body.substring(0, 200) + 
                                       (body.length > 200 ? "..." : ""));
                            
                            // Orijinal response'u bozmamak için yeniden oluştur
                            var newBody = Java.use("okhttp3.ResponseBody").create(
                                response.body().contentType(),
                                body
                            );
                            
                            var newResponse = response.newBuilder().body(newBody).build();
                            callback.onResponse(call, newResponse);
                        } catch (e) {
                            callback.onResponse(call, response);
                        }
                    }
                }
            }).$new();
            
            return originalEnqueue.call(this, wrappedCallback);
        };
        
    } catch (e) {
        console.log("[⚠️] OkHTTP monitor error: " + e);
    }
}

function monitorWebViewTraffic() {
    try {
        var WebView = Java.use("android.webkit.WebView");
        
        WebView.loadUrl.overload('java.lang.String').implementation = function(url) {
            if (url.startsWith("http")) {
                console.log("[🌍] WebView Load: " + url);
            }
            return this.loadUrl(url);
        };
        
        // WebViewClient için
        var WebViewClient = Java.use("android.webkit.WebViewClient");
        WebViewClient.shouldOverrideUrlLoading.overload('android.webkit.WebView', 'android.webkit.WebResourceRequest').implementation = function(webView, request) {
            var url = request.getUrl().toString();
            if (url.startsWith("http")) {
                console.log("[🌍] WebView Navigation: " + url);
            }
            return this.shouldOverrideUrlLoading(webView, request);
        };
        
    } catch (e) {
        console.log("[⚠️] WebView monitor error: " + e);
    }
}

function monitorUrlConnections() {
    try {
        var URLConnection = Java.use("java.net.URLConnection");
        
        URLConnection.connect.implementation = function() {
            var url = this.getURL().toString();
            if (url.startsWith("http")) {
                console.log("[🔗] URLConnection: " + url);
            }
            return this.connect();
        };
        
        // InputStream için (veri alışverişi)
        URLConnection.getInputStream.implementation = function() {
            var url = this.getURL().toString();
            if (url.startsWith("http")) {
                console.log("[📥] Receiving data from: " + url);
            }
            return this.getInputStream();
        };
        
    } catch (e) {
        console.log("[⚠️] URLConnection monitor error: " + e);
    }
}

function logConnectionDetails(connection) {
    try {
        // Request method
        if (connection.getClass().getName().includes("HttpURLConnection")) {
            var method = connection.getRequestMethod();
            console.log("[⚡] HTTP Method: " + method);
        }
        
        // Headers
        try {
            var headers = connection.getRequestProperties();
            if (headers) {
                for (var key in headers) {
                    if (key && (key.toLowerCase().includes("auth") || key.toLowerCase().includes("token"))) {
                        console.log("[🔑] Header: " + key + " = " + headers[key]);
                    }
                }
            }
        } catch (e) {}
        
    } catch (e) {
        // Header okuma hatası
    }
}

// 2 saniye sonra ek monitorleri başlat
setTimeout(function() {
    console.log("[🔍] Starting additional monitors...");
    monitorSystemHttpTraffic();
}, 2000);

function monitorSystemHttpTraffic() {
    try {
        // Android System HTTP client'ları
        var AndroidHttpClient = Java.use("android.net.http.AndroidHttpClient");
        if (AndroidHttpClient) {
            AndroidHttpClient.execute.overload('org.apache.http.HttpHost', 'org.apache.http.HttpRequest').implementation = function(host, request) {
                var url = host.toURI() + request.getRequestLine().getUri();
                console.log("[🤖] AndroidHttpClient: " + url);
                return this.execute(host, request);
            };
        }
    } catch (e) {}
}

console.log("[🎯] Network traffic monitor ready!");