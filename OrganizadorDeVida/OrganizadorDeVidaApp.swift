import SwiftUI
import SwiftData

@main
struct OrganizadorDeVidaApp: App {
    var body: some Scene {
        WindowGroup {
            TabView {
                HomeView().tabItem { Label("Inicio", systemImage: "house") }
                HabitsView().tabItem { Label("Hábitos", systemImage: "checkmark.circle") }
            }
        }
        .modelContainer(for: Habit.self)
    }
}
