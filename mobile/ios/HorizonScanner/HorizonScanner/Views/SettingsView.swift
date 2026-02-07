import SwiftUI

/// Settings screen for configuring the Horizon API connection.
struct SettingsView: View {
    @EnvironmentObject var settings: AppSettings

    var body: some View {
        NavigationStack {
            Form {
                Section("Horizon Backend") {
                    TextField("API Base URL", text: $settings.apiBaseURL)
                        .keyboardType(.URL)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                    TextField("Auth Token", text: $settings.authToken)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                }

                Section("Info") {
                    HStack {
                        Text("LiDAR Available")
                        Spacer()
                        Text(RoomPlanSupport.isAvailable ? "Yes" : "No")
                            .foregroundStyle(RoomPlanSupport.isAvailable ? .green : .red)
                    }
                    HStack {
                        Text("App Version")
                        Spacer()
                        Text("0.1.0").foregroundStyle(.gray)
                    }
                }
            }
            .navigationTitle("Settings")
        }
    }
}
