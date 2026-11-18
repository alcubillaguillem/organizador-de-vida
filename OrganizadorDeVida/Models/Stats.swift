import Foundation

enum Stats {
    /// Días seguidos hasta hoy. Si hoy aún no está hecho, cuenta desde ayer.
    static func currentStreak(_ days: [Date], today: Date = .now, calendar: Calendar = .current) -> Int {
        let set = Set(days.map(calendar.startOfDay))
        var day = calendar.startOfDay(for: today)
        if !set.contains(day) { day = calendar.date(byAdding: .day, value: -1, to: day)! }
        var count = 0
        while set.contains(day) {
            count += 1
            day = calendar.date(byAdding: .day, value: -1, to: day)!
        }
        return count
    }

    static func bestStreak(_ days: [Date], calendar: Calendar = .current) -> Int {
        var best = 0, run = 0
        var previous: Date?
        for day in Set(days.map(calendar.startOfDay)).sorted() {
            let consecutive = previous.map { calendar.dateComponents([.day], from: $0, to: day).day == 1 } ?? false
            run = consecutive ? run + 1 : 1
            best = max(best, run)
            previous = day
        }
        return best
    }

    /// Fracción cumplida de los últimos 7 días (hoy incluido), sin contar días anteriores a la creación.
    static func weeklyRate(_ days: [Date], since createdAt: Date, today: Date = .now, calendar: Calendar = .current) -> Double {
        let set = Set(days.map(calendar.startOfDay))
        let start = calendar.startOfDay(for: createdAt)
        let week = (0..<7)
            .map { calendar.date(byAdding: .day, value: -$0, to: calendar.startOfDay(for: today))! }
            .filter { $0 >= start }
        guard !week.isEmpty else { return 0 }
        return Double(week.filter(set.contains).count) / Double(week.count)
    }
}
