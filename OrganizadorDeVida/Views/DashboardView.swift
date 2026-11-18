import SwiftUI
import SwiftData
import Charts

struct DashboardView: View {
    @Query(sort: \Habit.createdAt) private var habits: [Habit]

    private var lastDays: [Date] {
        let today = Calendar.current.startOfDay(for: .now)
        return (0..<14).reversed().map { Calendar.current.date(byAdding: .day, value: -$0, to: today)! }
    }

    var body: some View {
        List {
            Section("Hábitos cumplidos, últimos 14 días") {
                Chart(lastDays, id: \.self) { day in
                    BarMark(x: .value("Día", day, unit: .day),
                            y: .value("Cumplidos", habits.filter { $0.isDone(on: day) }.count))
                }
                .chartYScale(domain: 0...max(habits.count, 1))
                .frame(height: 180)
            }
            Section("Por hábito") {
                ForEach(habits) { habit in
                    VStack(alignment: .leading) {
                        Text(habit.name).font(.headline)
                        Text("Racha \(Stats.currentStreak(habit.doneDays)) · Mejor \(Stats.bestStreak(habit.doneDays)) · Semana \(Int(Stats.weeklyRate(habit.doneDays, since: habit.createdAt) * 100)) %")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .navigationTitle("Consistencia")
    }
}
