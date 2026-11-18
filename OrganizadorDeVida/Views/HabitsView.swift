import SwiftUI
import SwiftData

struct HabitsView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \Habit.createdAt) private var habits: [Habit]
    @State private var adding = false
    @State private var newName = ""

    var body: some View {
        NavigationStack {
            List {
                ForEach(habits) { habit in
                    Button { habit.toggle() } label: {
                        Label(habit.name, systemImage: habit.isDone(on: .now) ? "checkmark.circle.fill" : "circle")
                    }
                    .foregroundStyle(.primary)
                }
                .onDelete { $0.forEach { context.delete(habits[$0]) } }
            }
            .overlay {
                if habits.isEmpty { ContentUnavailableView("Sin hábitos", systemImage: "checklist") }
            }
            .navigationTitle("Hábitos")
            .toolbar {
                NavigationLink { DashboardView() } label: { Image(systemName: "chart.bar") }
                Button("Añadir", systemImage: "plus") { adding = true }
            }
            .alert("Nuevo hábito", isPresented: $adding) {
                TextField("Nombre", text: $newName)
                Button("Añadir", action: add)
                Button("Cancelar", role: .cancel) { newName = "" }
            }
        }
    }

    private func add() {
        let name = newName.trimmingCharacters(in: .whitespacesAndNewlines)
        if !name.isEmpty { context.insert(Habit(name: String(name.prefix(60)))) }
        newName = ""
    }
}
