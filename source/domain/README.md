<!-- version 1.1 -->
# Domain

Основные предметные области Raymondovich и их бизнес-правила.

- Domain содержит независимые сущности, value objects, инварианты и правила допустимых изменений.
- Domain не импортирует Presentation, Application, Infrastructure, Supabase SDK, DOM или browser APIs.
- Внешние данные преобразуются в domain-модель на границе адаптеров; бизнес-правила не должны зависеть от формы UI или таблиц БД.
