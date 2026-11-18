import Foundation
import Testing
@testable import OrganizadorDeVida

struct StatsTests {
    let cal = Calendar(identifier: .gregorian)
    let today = Calendar(identifier: .gregorian).date(from: DateComponents(year: 2026, month: 11, day: 18, hour: 10))!

    func daysAgo(_ n: Int...) -> [Date] {
        n.map { cal.date(byAdding: .day, value: -$0, to: today)! }
    }

    @Test func rachaActualCuentaDesdeAyerSiHoyFalta() {
        #expect(Stats.currentStreak(daysAgo(1, 2, 3, 5), today: today, calendar: cal) == 3)
        #expect(Stats.currentStreak(daysAgo(0, 1), today: today, calendar: cal) == 2)
        #expect(Stats.currentStreak(daysAgo(2), today: today, calendar: cal) == 0)
    }

    @Test func mejorRacha() {
        #expect(Stats.bestStreak(daysAgo(0, 1, 5, 6, 7, 7), calendar: cal) == 3)
        #expect(Stats.bestStreak([], calendar: cal) == 0)
    }

    @Test func porcentajeSemanalRespetaFechaDeCreacion() {
        let created = daysAgo(1)[0]
        #expect(Stats.weeklyRate(daysAgo(0), since: created, today: today, calendar: cal) == 0.5)
        let old = daysAgo(30)[0]
        #expect(Stats.weeklyRate(daysAgo(0, 1, 2, 3, 4, 5, 6, 7), since: old, today: today, calendar: cal) == 1)
    }
}
