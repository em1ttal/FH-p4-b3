<!-- 
  ChecklistSection.vue
  Componente que gestiona las listas de verificación (checklists) de una tarea.
  Permite crear, editar y eliminar listas de verificación y sus elementos,
  con soporte para generación automática de subtareas mediante IA.
-->

<template>
  <div class="form-group" role="region" aria-label="Listas de verificación">
    <!-- Cabecera con título y botón de generación IA -->
    <div class="section-header">
      <label id="subtasks-label">Subtareas</label>
      <button
        type="button"
        class="action-button"
        @click="generateSubtasks"
        :disabled="!taskTitle || !taskDescription || !taskId"
        aria-label="Generar subtareas con IA"
        :aria-disabled="!taskTitle || !taskDescription || !taskId"
      >
        <span class="icon" aria-hidden="true">✨</span>
        Generar con IA
      </button>
    </div>

    <!-- Contenedor de listas de verificación -->
    <div class="checklists" role="list" aria-labelledby="subtasks-label">
      <div v-for="checklist in checklists" :key="checklist.id" class="checklist" role="listitem">
        <!-- Cabecera de la lista -->
        <div class="checklist-header">
          <h4 :id="`checklist-${checklist.id}-title`">{{ checklist.title }}</h4>
          <button
            type="button"
            class="icon-button"
            @click="deleteChecklist(checklist.id)"
            :aria-label="`Eliminar lista ${checklist.title}`"
          >
            <span aria-hidden="true">x</span>
          </button>
        </div>

        <!-- Barra de progreso -->
        <div class="checklist-progress">
          <div
            class="progress-bar"
            role="progressbar"
            :aria-valuenow="calculateChecklistProgress(checklist)"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-label="`Progreso de ${checklist.title}`"
          >
            <div
              class="progress-fill"
              :style="{ width: calculateChecklistProgress(checklist) + '%' }"
              aria-hidden="true"
            ></div>
          </div>
          <span class="progress-text" aria-live="polite">
            {{ calculateChecklistProgress(checklist) }}%
          </span>
        </div>

        <!-- Lista de elementos -->
        <div
          class="checklist-items"
          role="list"
          :aria-labelledby="`checklist-${checklist.id}-title`"
        >
          <div
            v-for="item in checklist.items"
            :key="item.id"
            class="checklist-item"
            role="listitem"
          >
            <label class="checkbox-label">
              <input
                type="checkbox"
                :checked="item.completed"
                @change="toggleChecklistItem(checklist.id, item.id)"
                :aria-label="`Marcar como ${item.completed ? 'incompleta' : 'completa'} la tarea: ${item.text}`"
              />
              <span :class="{ completed: item.completed }">{{ item.text }}</span>
            </label>
            <button
              type="button"
              class="icon-button"
              @click="deleteChecklistItem(checklist.id, item.id)"
              :aria-label="`Eliminar tarea: ${item.text}`"
            >
              <span aria-hidden="true">x</span>
            </button>
          </div>
        </div>

        <!-- Formulario para añadir nuevo elemento -->
        <div class="add-item-form" role="form" aria-label="Añadir nueva tarea">
          <input
            type="text"
            v-model="newItemTexts[checklist.id]"
            placeholder="Añadir un elemento..."
            class="styled-input"
            @keyup.enter="addChecklistItem(checklist.id)"
            :aria-label="`Añadir tarea a ${checklist.title}`"
          />
          <button
            type="button"
            class="action-button"
            @click="addChecklistItem(checklist.id)"
            :disabled="!newItemTexts[checklist.id]"
            :aria-disabled="!newItemTexts[checklist.id]"
            aria-label="Añadir tarea"
          >
            Añadir
          </button>
        </div>
      </div>

      <!-- Botón o formulario para nueva lista -->
      <button
        type="button"
        class="add-checklist-btn"
        @click="showNewChecklistForm = true"
        v-if="!showNewChecklistForm"
        aria-label="Añadir nueva lista de verificación"
        :disabled="!props.taskId"
        :title="addChecklistBtnTitle"
      >
        + Añadir lista de verificación
      </button>
      <div v-else class="new-checklist-form" role="form" aria-label="Formulario de nueva lista">
        <input
          type="text"
          v-model="newChecklistTitle"
          placeholder="Título de la lista..."
          class="styled-input"
          aria-label="Título de la nueva lista"
        />
        <div class="form-buttons">
          <button
            type="button"
            class="action-button"
            @click="addChecklist"
            :disabled="!newChecklistTitle"
            :aria-disabled="!newChecklistTitle"
            aria-label="Crear lista"
          >
            Añadir
          </button>
          <button
            type="button"
            class="action-button secondary"
            @click="showNewChecklistForm = false"
            aria-label="Cancelar creación de lista"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { aiService } from '../../services/aiService'
import { checklistService } from '../../services/checklistService'

const route = useRoute()

// Props del componente
const props = defineProps({
  taskId: {
    type: String,
    default: '',
  },
  checklists: {
    type: Array,
    default: () => [],
  },
  taskTitle: String,
  taskDescription: String,
})

// Eventos emitidos
const emit = defineEmits(['update:checklists'])

// Estado local
const showNewChecklistForm = ref(false)
const newChecklistTitle = ref('')
const newItemTexts = ref({})

// Tooltip for add checklist button
const addChecklistBtnTitle = computed(() => {
  return !props.taskId
    ? 'Guarda la tarea antes de añadir listas de verificación'
    : 'Añadir una nueva lista de verificación'
})

/**
 * Calcula el porcentaje de progreso de una lista de verificación
 * @param {Object} checklist - Lista de verificación
 * @returns {number} Porcentaje de elementos completados
 */
const calculateChecklistProgress = (checklist) => {
  if (!checklist.items || checklist.items.length === 0) return 0
  const completedItems = checklist.items.filter((item) => item.completed).length
  return Math.round((completedItems / checklist.items.length) * 100)
}

/**
 * Añade una nueva lista de verificación
 */
const addChecklist = async () => {
  if (!newChecklistTitle.value.trim()) return

  try {
    const boardId = parseInt(route.params.id)
    const newChecklist = await checklistService.addChecklist(
      boardId,
      props.taskId,
      newChecklistTitle.value.trim(),
    )

    emit('update:checklists', [...props.checklists, newChecklist])
    newChecklistTitle.value = ''
    showNewChecklistForm.value = false
  } catch (error) {
    console.error('Error al crear checklist:', error)
  }
}

/**
 * Elimina una lista de verificación
 * @param {string} checklistId - ID de la lista a eliminar
 */
const deleteChecklist = async (checklistId) => {
  try {
    const boardId = parseInt(route.params.id)
    await checklistService.deleteChecklist(boardId, props.taskId, checklistId)
    emit(
      'update:checklists',
      props.checklists.filter((c) => c.id !== checklistId),
    )
  } catch (error) {
    console.error('Error al eliminar checklist:', error)
  }
}

/**
 * Añade un nuevo elemento a una lista de verificación
 * @param {string} checklistId - ID de la lista
 */
const addChecklistItem = async (checklistId) => {
  const text = newItemTexts.value[checklistId]
  if (!text) return

  try {
    const boardId = parseInt(route.params.id)
    const checklistIndex = props.checklists.findIndex((c) => c.id === checklistId)
    if (checklistIndex === -1) return

    const newItem = {
      id: `item-${Date.now()}`,
      text,
      completed: false,
    }

    // Crear una copia profunda del checklist
    const updatedChecklist = JSON.parse(JSON.stringify(props.checklists[checklistIndex]))
    updatedChecklist.items.push(newItem)

    await checklistService.updateChecklist(boardId, props.taskId, checklistId, updatedChecklist)

    // Crear una nueva copia del array de checklists
    const updatedChecklists = [...props.checklists]
    updatedChecklists[checklistIndex] = updatedChecklist

    emit('update:checklists', updatedChecklists)
    newItemTexts.value[checklistId] = ''
  } catch (error) {
    console.error('Error al añadir elemento:', error)
  }
}

/**
 * Alterna el estado de completado de un elemento
 * @param {string} checklistId - ID de la lista
 * @param {string} itemId - ID del elemento
 */
const toggleChecklistItem = async (checklistId, itemId) => {
  try {
    const boardId = parseInt(route.params.id)
    const checklist = props.checklists.find((c) => c.id === checklistId)
    if (!checklist) return

    const item = checklist.items.find((i) => i.id === itemId)
    if (!item) return

    const updatedChecklist = {
      ...checklist,
      items: checklist.items.map((i) => (i.id === itemId ? { ...i, completed: !i.completed } : i)),
    }

    await checklistService.updateChecklist(boardId, props.taskId, checklistId, updatedChecklist)
    emit(
      'update:checklists',
      props.checklists.map((c) => (c.id === checklistId ? updatedChecklist : c)),
    )
  } catch (error) {
    console.error('Error al actualizar item:', error)
  }
}

/**
 * Elimina un elemento de una lista de verificación
 * @param {string} checklistId - ID de la lista
 * @param {string} itemId - ID del elemento
 */
const deleteChecklistItem = async (checklistId, itemId) => {
  try {
    const boardId = parseInt(route.params.id)
    const checklist = props.checklists.find((c) => c.id === checklistId)
    if (!checklist) return

    const updatedChecklist = {
      ...checklist,
      items: checklist.items.filter((i) => i.id !== itemId),
    }

    await checklistService.updateChecklist(boardId, props.taskId, checklistId, updatedChecklist)
    emit(
      'update:checklists',
      props.checklists.map((c) => (c.id === checklistId ? updatedChecklist : c)),
    )
  } catch (error) {
    console.error('Error al eliminar item:', error)
  }
}

/**
 * Genera subtareas automáticamente usando IA
 */
const generateSubtasks = async () => {
  if (!props.taskTitle || !props.taskDescription) return

  try {
    const subtasks = await aiService.generateSubtasks({
      title: props.taskTitle,
      description: props.taskDescription,
    })

    const boardId = parseInt(route.params.id)
    const newChecklist = await checklistService.addChecklist(
      boardId,
      props.taskId,
      'Subtareas generadas por IA',
      subtasks,
    )

    emit('update:checklists', [...props.checklists, newChecklist])
  } catch (error) {
    console.error('Error al generar subtareas:', error)
  }
}
</script>

<!-- 
  Estilos del componente
  - Diseño de listas con scroll vertical
  - Barras de progreso animadas
  - Estilos para elementos interactivos
-->
<style scoped>
/* Contenedor principal de listas */
.checklists {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 400px;
  overflow-y: auto;
  padding: 0.5rem;
  margin: -0.5rem;

  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.3) transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }
}

/* Lista de verificación individual */
.checklist {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 0.5rem;
  padding: 1rem;
}

/* Cabecera de lista */
.checklist-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

/* Barra de progreso */
.checklist-progress {
  margin-bottom: 1rem;
}

.progress-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #61bd4f; /* Verde para progreso */
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 0.25rem;
}

/* Lista de elementos */
.checklist-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

/* Elemento individual */
.checklist-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Estilo del checkbox */
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-label input[type='checkbox'] {
  width: 1.2rem;
  height: 1.2rem;
  cursor: pointer;
}

.checkbox-label span.completed {
  text-decoration: line-through;
  color: rgba(255, 255, 255, 0.5);
}

/* Formulario para añadir elementos */
.add-item-form {
  display: flex;
  gap: 0.5rem;
}

/* Botón para añadir lista */
.add-checklist-btn {
  width: 100%;
  padding: 0.8rem;
  border: 2px dashed rgba(255, 255, 255, 0.2);
  border-radius: 0.5rem;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-checklist-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.3);
}

.add-checklist-btn:disabled,
.add-checklist-btn:disabled:hover {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.4);
  cursor: not-allowed;
}

/* Formulario de nueva lista */
.new-checklist-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Botones de acción */
.form-buttons {
  display: flex;
  gap: 0.5rem;
}

/* Cabecera de sección */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;

  label {
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
  }
}

/* Botón de acción principal */
.action-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.action-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-button.secondary {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Botón de icono */
.icon-button {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 0.2rem;
  font-size: 1.2rem;
  border-radius: 0.3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.icon-button:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

/* Input estilizado */
.styled-input {
  width: 100%;
  padding: 0.8rem;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  color: white;
  font-size: 1rem;
}
</style>
