import SwiftUI

@main
struct OrganizadorDeVidaApp: App {
    var body: some Scene {
        WindowGroup {
            TabView {
                HomeView().tabItem { Label("Inicio", systemImage: "house") }
            }
        }
    }
}
