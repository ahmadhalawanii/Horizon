import Foundation

/// Sends layout data to the Horizon backend.
class HorizonAPI {
    let baseURL: String
    let token: String

    init(baseURL: String, token: String) {
        self.baseURL = baseURL
        self.token = token
    }

    func uploadLayout(_ layout: HomeLayout) async throws -> UploadResult {
        guard let url = URL(string: "\(baseURL)/layout/import") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 15

        let encoder = JSONEncoder()
        request.httpBody = try encoder.encode(layout)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.networkError
        }
        guard (200...299).contains(httpResponse.statusCode) else {
            let body = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw APIError.serverError(httpResponse.statusCode, body)
        }

        return try JSONDecoder().decode(UploadResult.self, from: data)
    }
}

struct UploadResult: Codable {
    let homeId: Int
    let roomsCreated: Int
    let roomsUpdated: Int

    enum CodingKeys: String, CodingKey {
        case homeId = "home_id"
        case roomsCreated = "rooms_created"
        case roomsUpdated = "rooms_updated"
    }
}

enum APIError: LocalizedError {
    case invalidURL
    case networkError
    case serverError(Int, String)

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid API URL"
        case .networkError: return "Network error"
        case .serverError(let code, let msg): return "Server error \(code): \(msg)"
        }
    }
}
