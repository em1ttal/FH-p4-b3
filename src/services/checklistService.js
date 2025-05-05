/**
 * @module checklistService
 * @description Servicio que gestiona todas las operaciones relacionadas con checklists en las tareas.
 * Proporciona funcionalidades para crear, actualizar, eliminar y obtener checklists.
 */

import { tasks } from '../data/tasks'
import { delay } from '../utils/asyncUtils'

export const checklistService = {
  /**
   * Añade una nueva checklist a una tarea
   * @async
   * @param {string|number} boardId - ID del tablero
   * @param {string} taskId - ID de la tarea
   * @param {string} checklistTitle - Título de la checklist
   * @param {Array<Object>} [initialItems=[]] - Items iniciales de la checklist
   * @param {string} [initialItems[].id] - ID opcional del item
   * @param {string} initialItems[].text - Texto del item
   * @param {boolean} [initialItems[].completed=false] - Estado de completitud del item
   * @returns {Promise<Object>} La checklist creada
   * @throws {Error} Si la tarea no existe
   */
  async addChecklist(boardId, taskId, checklistTitle, initialItems = []) {
    await delay(300)
    if (!tasks[boardId] || !tasks[boardId][taskId]) {
      throw new Error('Task not found')
    }

    const task = tasks[boardId][taskId]
    const newChecklist = {
      id: `checklist-${Date.now()}`,
      title: checklistTitle,
      items: initialItems.map((item) => ({
        ...item,
        id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      })),
    }

    if (!task.checklists) {
      task.checklists = []
    }
    task.checklists.push(newChecklist)
    return newChecklist
  },

  /**
   * Actualiza una checklist existente
   * @async
   * @param {string|number} boardId - ID del tablero
   * @param {string} taskId - ID de la tarea
   * @param {string} checklistId - ID de la checklist
   * @param {Object} updates - Campos a actualizar
   * @param {string} [updates.title] - Nuevo título de la checklist
   * @param {Array<Object>} [updates.items] - Nueva lista de items
   * @returns {Promise<Object>} La checklist actualizada
   * @throws {Error} Si la tarea o la checklist no existen
   */
  async updateChecklist(boardId, taskId, checklistId, updates) {
    await delay(300)
    if (!tasks[boardId] || !tasks[boardId][taskId]) {
      throw new Error('Task not found')
    }

    const task = tasks[boardId][taskId]
    const checklist = task.checklists.find((c) => c.id === checklistId)
    if (!checklist) throw new Error('Checklist not found')

    Object.assign(checklist, updates)
    task.updatedAt = new Date().toISOString()
    return checklist
  },

  /**
   * Elimina una checklist de una tarea
   * @async
   * @param {string|number} boardId - ID del tablero
   * @param {string} taskId - ID de la tarea
   * @param {string} checklistId - ID de la checklist a eliminar
   * @returns {Promise<void>}
   * @throws {Error} Si la tarea no existe
   */
  async deleteChecklist(boardId, taskId, checklistId) {
    await delay(300)
    if (!tasks[boardId] || !tasks[boardId][taskId]) {
      throw new Error('Task not found')
    }

    const task = tasks[boardId][taskId]
    task.checklists = task.checklists.filter((c) => c.id !== checklistId)
    task.updatedAt = new Date().toISOString()
  },

  /**
   * Obtiene todas las checklists de una tarea
   * @async
   * @param {string|number} boardId - ID del tablero
   * @param {string} taskId - ID de la tarea
   * @returns {Promise<Array<Object>>} Lista de checklists de la tarea
   * @throws {Error} Si la tarea no existe
   */
  async getChecklists(boardId, taskId) {
    await delay(300)
    if (!tasks[boardId] || !tasks[boardId][taskId]) {
      throw new Error('Tarea no encontrada')
    }
    return tasks[boardId][taskId].checklists || []
  },
}
