const API_URL = "";
const STATUSES = [
  ["PENDENTE", "Pendente"],
  ["EM_ANDAMENTO", "Em andamento"],
  ["CONCLUIDA", "Concluída"],
];

const createForm = document.querySelector("#create-form");
const refreshButton = document.querySelector("#refresh-button");
const taskList = document.querySelector("#task-list");
const notice = document.querySelector("#notice");
let tasks = [];

function showNotice(message, isError = false) {
  notice.textContent = message;
  notice.classList.toggle("error", isError);
  notice.hidden = false;
}

function clearNotice() {
  notice.hidden = true;
  notice.textContent = "";
  notice.classList.remove("error");
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const text = await response.text();
  let body = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : body?.message || body || `Erro HTTP ${response.status}`;
    throw new Error(String(message));
  }

  return body;
}

function makeStatusSelect(task) {
  const select = document.createElement("select");
  select.setAttribute("aria-label", `Status da tarefa ${task.id}`);
  const statuses = [...STATUSES];

  if (!statuses.some(([value]) => value === task.status)) {
    statuses.push([task.status, task.status]);
  }

  for (const [value, label] of statuses) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.selected = value === task.status;
    select.append(option);
  }
  return select;
}

function renderTasks() {
  taskList.replaceChildren();

  for (const task of tasks) {
    const item = document.createElement("li");
    item.className = "task-item";

    const description = document.createElement("p");
    description.textContent =
      `#${task.id} - ${task.descricao} | Início: ${task.inicio} | Fim: ${task.fim} | Status: ${task.status}`;

    const controls = document.createElement("div");
    controls.className = "task-controls";

    const statusForm = document.createElement("form");
    statusForm.dataset.action = "status";
    statusForm.dataset.id = task.id;
    statusForm.append(makeStatusSelect(task));
    const statusButton = document.createElement("button");
    statusButton.type = "submit";
    statusButton.textContent = "Atualizar status";
    statusForm.append(statusButton);

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.dataset.action = "edit";
    editButton.dataset.id = task.id;
    editButton.textContent = "Editar";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.dataset.action = "delete";
    deleteButton.dataset.id = task.id;
    deleteButton.textContent = "Excluir";

    controls.append(statusForm, editButton, deleteButton);
    item.append(description, controls);
    taskList.append(item);
  }
}

async function loadTasks() {
  refreshButton.disabled = true;
  try {
    const result = await request("/tasks");
    if (!Array.isArray(result)) {
      throw new Error("A API retornou uma lista inválida.");
    }
    tasks = result;
    renderTasks();
    clearNotice();
    return true;
  } catch (error) {
    showNotice(`Não foi possível carregar as tarefas: ${error.message}`, true);
    return false;
  } finally {
    refreshButton.disabled = false;
  }
}

function getTaskData(form) {
  const values = new FormData(form);
  const inicio = Number(values.get("inicio"));
  const fim = Number(values.get("fim"));
  const descricao = String(values.get("descricao")).trim();

  if (!descricao) {
    throw new Error("Digite a descrição da tarefa.");
  }
  if (!Number.isFinite(inicio) || !Number.isFinite(fim)) {
    throw new Error("Informe valores numéricos para o intervalo.");
  }
  if (fim < inicio) {
    throw new Error("O fim do intervalo deve ser igual ou maior que o início.");
  }

  return { descricao, inicio: String(inicio), fim: String(fim) };
}

createForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = createForm.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    await request("/tasks", {
      method: "POST",
      body: JSON.stringify(getTaskData(createForm)),
    });
    createForm.reset();
    if (await loadTasks()) {
      showNotice("Tarefa cadastrada.");
    }
  } catch (error) {
    showNotice(`Não foi possível cadastrar a tarefa: ${error.message}`, true);
  } finally {
    button.disabled = false;
  }
});

taskList.addEventListener("submit", async (event) => {
  const form = event.target.closest('form[data-action="status"]');
  if (!form) {
    return;
  }
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const status = form.querySelector("select").value;
    await request(`/tasks/${form.dataset.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (await loadTasks()) {
      showNotice("Status atualizado.");
    }
  } catch (error) {
    showNotice(`Não foi possível atualizar o status: ${error.message}`, true);
  } finally {
    button.disabled = false;
  }
});

taskList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const task = tasks.find((item) => String(item.id) === button.dataset.id);
  if (!task) {
    return;
  }

  if (button.dataset.action === "edit") {
    const descricao = window.prompt("Descrição:", task.descricao);
    if (descricao === null) {
      return;
    }
    const inicio = window.prompt("Início do intervalo:", task.inicio);
    if (inicio === null) {
      return;
    }
    const fim = window.prompt("Fim do intervalo:", task.fim);
    if (fim === null) {
      return;
    }

    try {
      const inicioNumero = Number(inicio);
      const fimNumero = Number(fim);
      if (!Number.isFinite(inicioNumero) || !Number.isFinite(fimNumero)) {
        throw new Error("Informe valores numéricos para o intervalo.");
      }
      if (fimNumero < inicioNumero) {
        throw new Error("O fim do intervalo deve ser igual ou maior que o início.");
      }
      await request(`/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          descricao: descricao.trim(),
          inicio: String(inicioNumero),
          fim: String(fimNumero),
        }),
      });
      if (await loadTasks()) {
        showNotice("Tarefa atualizada.");
      }
    } catch (error) {
      showNotice(`Não foi possível editar a tarefa: ${error.message}`, true);
    }
  }

  if (button.dataset.action === "delete") {
    if (!window.confirm(`Excluir a tarefa "${task.descricao}"?`)) {
      return;
    }
    button.disabled = true;
    try {
      await request(`/tasks/${task.id}`, { method: "DELETE" });
      if (await loadTasks()) {
        showNotice("Tarefa excluída.");
      }
    } catch (error) {
      showNotice(`Não foi possível excluir a tarefa: ${error.message}`, true);
      button.disabled = false;
    }
  }
});

refreshButton.addEventListener("click", loadTasks);
loadTasks();
