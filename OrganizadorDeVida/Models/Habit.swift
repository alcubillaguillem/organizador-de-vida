import Foundation
import SwiftData

@Model
final class Habit {
    var name: String
    var createdAt: Date
    /// Días cumplidos, guardados como inicio de día.
    var doneDays: [Date] = []

    init(name: String, createdAt: Date = .now) {
        self.name = name
        self.createdAt = createdAt
    }

    func isDone(on day: Date, calendar: Calendar = .current) -> Bool {
        doneDays.contains { calendar.isDate($0, inSameDayAs: day) }
    }

    func toggle(on day: Date = .now, calendar: Calendar = .current) {
        if let i = doneDays.firstIndex(where: { calendar.isDate($0, inSameDayAs: day) }) {
            doneDays.remove(at: i)
        } else {
            doneDays.append(calendar.startOfDay(for: day))
        }
    }
}
