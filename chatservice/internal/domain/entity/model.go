package entity

// Regras de negócio dessa entidade
//

type Model struct {
	Name      string
	MaxTokens int
}

// Essa função cria uma nova instância da struct Model
// e retorna um ponteiro para ela
func NewModel(name string, maxTokens int) *Model {
	return &Model{
		Name:      name,
		MaxTokens: maxTokens,
	}
}

// Métodos getters
func (m *Model) GetMaxTokens() int {
	return m.MaxTokens
}

func (m *Model) GetName() string {
	return m.Name
}
