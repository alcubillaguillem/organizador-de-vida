import SwiftUI

// Aquí irán el resumen de correos y el evangelio del día.
struct HomeView: View {
    var body: some View {
        ContentUnavailableView("Próximamente", systemImage: "sun.max",
                               description: Text("Resumen diario y evangelio del día."))
    }
}
