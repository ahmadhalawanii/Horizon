import SwiftUI

/// Main scanning view: onboarding, scan trigger, review, and upload.
struct ScanView: View {
    @EnvironmentObject var settings: AppSettings
    @State private var capturedLayout: HomeLayout?
    @State private var isScanning = false
    @State private var showReview = false
    @State private var uploadStatus: UploadStatus = .idle
    @State private var errorMessage: String?

    enum UploadStatus {
        case idle, uploading, success(UploadResult), failed(String)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                if showReview, let layout = capturedLayout {
                    ReviewView(
                        layout: layout,
                        uploadStatus: $uploadStatus,
                        onUpload: uploadLayout,
                        onRescan: resetScan
                    )
                } else {
                    onboardingView
                }
            }
            .navigationTitle("Horizon Scanner")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    // MARK: - Onboarding

    private var onboardingView: some View {
        VStack(spacing: 32) {
            Spacer()

            Image(systemName: "camera.viewfinder")
                .font(.system(size: 72))
                .foregroundStyle(.cyan)

            VStack(spacing: 8) {
                Text("Scan Your Home")
                    .font(.title.bold())
                    .foregroundStyle(.white)
                Text("Create your Horizon digital twin by\nscanning your rooms with LiDAR.")
                    .font(.subheadline)
                    .foregroundStyle(.gray)
                    .multilineTextAlignment(.center)
            }

            VStack(spacing: 12) {
                if RoomPlanSupport.isAvailable {
                    Button(action: { isScanning = true }) {
                        Label("Start Scan", systemImage: "arkit")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.cyan)
                            .foregroundStyle(.black)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                    .fullScreenCover(isPresented: $isScanning) {
                        RoomPlanScanView(onComplete: handleScanComplete)
                    }
                } else {
                    Text("LiDAR not available on this device")
                        .font(.caption)
                        .foregroundStyle(.orange)
                }

                Button(action: useSampleScan) {
                    Label("Use Sample Scan", systemImage: "doc.badge.plus")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.gray.opacity(0.2))
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14)
                                .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                        )
                }
            }
            .padding(.horizontal, 32)

            Spacer()
            Spacer()
        }
    }

    // MARK: - Actions

    private func handleScanComplete(_ layout: HomeLayout) {
        isScanning = false
        capturedLayout = layout
        showReview = true
    }

    private func useSampleScan() {
        capturedLayout = SampleLayout.villaA
        showReview = true
    }

    private func uploadLayout() {
        guard let layout = capturedLayout else { return }
        uploadStatus = .uploading
        Task {
            do {
                let api = HorizonAPI(baseURL: settings.apiBaseURL, token: settings.authToken)
                let result = try await api.uploadLayout(layout)
                await MainActor.run { uploadStatus = .success(result) }
            } catch {
                await MainActor.run { uploadStatus = .failed(error.localizedDescription) }
            }
        }
    }

    private func resetScan() {
        capturedLayout = nil
        showReview = false
        uploadStatus = .idle
    }
}
