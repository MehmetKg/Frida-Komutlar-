Java.perform(function () {
    console.log("[*] Frida script loaded for co.mona.android");

    // --- 1. OkHttp CertificatePinner bypass ---
    try {
        var CertificatePinner = Java.use("okhttp3.CertificatePinner");
        CertificatePinner.check.overload('java.lang.String', 'java.util.List').implementation = function (hostname, peerCertificates) {
            console.log("[+] Bypassing OkHttp CertificatePinner for: " + hostname);
            // Hiçbir şey yapma → pinning bypass edildi
        };
    } catch (e) {
        console.log("[-] OkHttp CertificatePinner not found");
    }

    // --- 2. TrustManager (javax.net.ssl.X509TrustManager) bypass ---
    try {
        var X509TrustManager = Java.use("javax.net.ssl.X509TrustManager");
        var TrustManager = Java.registerClass({
            name: 'co.mona.android.TrustAllX509TrustManager',
            implements: [X509TrustManager],
            methods: {
                checkClientTrusted: function (chain, authType) {},
                checkServerTrusted: function (chain, authType) {},
                getAcceptedIssuers: function () {
                    return [];
                }
            }
        });

        var SSLContextImpl = Java.use("javax.net.ssl.SSLContextImpl");
        SSLContextImpl.init.overload(
            '[Ljavax.net.ssl.KeyManager;', 
            '[Ljavax.net.ssl.TrustManager;', 
            'java.security.SecureRandom'
        ).implementation = function (keyManager, trustManager, secureRandom) {
            console.log("[+] Bypassing SSLContext.init with custom TrustManager");
            return this.init(keyManager, [TrustManager.$new()], secureRandom);
        };
    } catch (e) {
        console.log("[-] Failed to hook SSLContext or X509TrustManager: " + e.message);
    }

    // --- 3. Exported Activity Loglama (güncellenmiş) ---
    var Activity = Java.use("android.app.Activity");
    Activity.onCreate.overload('android.os.Bundle').implementation = function (savedInstanceState) {
        var className = this.getClass().getSimpleName();
        var exportedActivities = [
            "SplashActivity",
            "HomeActivity",
            "OriginPayAuthActivity",
            "SingpassActivity",
            "PlaidExplainerActivity",
            "PlaidRelinkResultActivity",
            "EndOfYearActivity"
        ];
        if (exportedActivities.includes(className)) {
            console.log("[!] Exported Activity started: " + className);
        }
        return this.onCreate(savedInstanceState);
    };

    console.log("[*] Hooks installed successfully");
});