import SwiftUI

/// Global app settings — API URL and auth token.
class AppSettings: ObservableObject {
    @Published var apiBaseURL: String {
        didSet { UserDefaults.standard.set(apiBaseURL, forKey: "apiBaseURL") }
    }
    @Published var authToken: String {
        didSet { UserDefaults.standard.set(authToken, forKey: "authToken") }
    }

    init() {
        self.apiBaseURL = UserDefaults.standard.string(forKey: "apiBaseURL")
            ?? "http://192.168.1.100:8000"
        self.authToken = UserDefaults.standard.string(forKey: "authToken")
            ?? "horizon-demo-token"
    }
}
