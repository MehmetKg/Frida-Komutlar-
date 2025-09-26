Java.perform(function() {
    console.log("[✅] OWASP Goat Alert Script Started");
    
    var System = Java.use('java.lang.System');
    var ActivityThread = Java.use("android.app.ActivityThread");
    var AlertDialogBuilder = Java.use("android.app.AlertDialog$Builder");
    var DialogInterfaceOnClickListener = Java.use('android.content.DialogInterface$OnClickListener');

    // Tüm Activity'leri hook'la ama super call'u koru
    Java.use("android.app.Activity").onCreate.overload("android.os.Bundle").implementation = function(savedInstanceState) {
        try {
            var currentActivity = this;
            var application = ActivityThread.currentApplication();
            var context = application.getApplicationContext();
            
            // Paket ismini al
            var packageName = context.getPackageName();
            
            // Launch intent ve activity info al
            var packageManager = context.getPackageManager();
            var launcherIntent = packageManager.getLaunchIntentForPackage(packageName);
            
            if (launcherIntent) {
                var launchActivityInfo = launcherIntent.resolveActivityInfo(packageManager, 0);
                
                if (launchActivityInfo && launchActivityInfo.name) {
                    var mainActivityName = launchActivityInfo.name;
                    
                    // Sadece main activity'de alert göster
                    if (mainActivityName === this.getClass().getName()) {
                        console.log("[🎯] Main Activity detected: " + mainActivityName);
                        
                        // UI thread'de alert göster
                        Java.scheduleOnMainThread(function() {
                            try {
                                var alertBuilder = AlertDialogBuilder.$new(currentActivity);
                                alertBuilder.setTitle("OWASP Goat Alert");
                                alertBuilder.setMessage("What you want to do now?");
                                
                                // Positive button
                                alertBuilder.setPositiveButton("Dismiss", Java.registerClass({
                                    name: 'com.example.PositiveClickListener',
                                    implements: [DialogInterfaceOnClickListener],
                                    methods: {
                                        onClick: function(dialog, which) {
                                            dialog.dismiss();
                                            console.log("[✅] Dialog dismissed");
                                        }
                                    }
                                }).$new());
                                
                                // Negative button
                                alertBuilder.setNegativeButton("Force Close", Java.registerClass({
                                    name: 'com.example.NegativeClickListener',
                                    implements: [DialogInterfaceOnClickListener],
                                    methods: {
                                        onClick: function(dialog, which) {
                                            currentActivity.finish();
                                            System.exit(0);
                                            console.log("[⛔] App force closed");
                                        }
                                    }
                                }).$new());
                                
                                // Alert'i göster
                                var alertDialog = alertBuilder.create();
                                alertDialog.show();
                                
                            } catch (e) {
                                console.log("[❌] Alert error: " + e);
                            }
                        });
                    }
                }
            }
        } catch (e) {
            console.log("[❌] Error in onCreate hook: " + e);
        }
        
        // SUPER CALL'U MUTLAKA ÇAĞIR - BU ÇOK ÖNEMLİ!
        return this.onCreate.overload("android.os.Bundle").call(this, savedInstanceState);
    };
    
    console.log("[✅] Activity hook successfully installed");
});