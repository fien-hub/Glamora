import Expo
import React
import ReactAppDependencyProvider

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    NSLog("[GlamoraBoot] didFinishLaunching start")

    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    NSLog("[GlamoraBoot] ReactNative factory created")

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

    let bundlePath = Bundle.main.path(forResource: "main", ofType: "jsbundle") ?? "<missing>"
    NSLog("[GlamoraBoot] bundled JS path: \(bundlePath)")

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    NSLog("[GlamoraBoot] starting ReactNative module=main")
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
    NSLog("[GlamoraBoot] startReactNative returned")
#endif

    let result = super.application(application, didFinishLaunchingWithOptions: launchOptions)
    NSLog("[GlamoraBoot] super.didFinishLaunching returned: \(result)")
    return result
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    let url = Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    if url == nil {
      NSLog("[GlamoraBoot] ERROR: main.jsbundle not found in app bundle")
    }
    return url
#endif
  }
}
