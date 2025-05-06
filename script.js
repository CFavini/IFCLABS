// script.js - Edição de Células e Linhas

document.addEventListener('DOMContentLoaded', async () => {
    // --- Verificação de Token (Simulação) ---
    const authToken = sessionStorage.getItem('ifclabsAuthToken');
    const expectedTokenPrefix = "MVP_TOKEN_IFCLABS_";
    const pathIsListaHtml = window.location.pathname.endsWith('lista.html') || window.location.pathname.endsWith('/IFCLABS/lista.html');

    if (pathIsListaHtml) {
        if (!authToken || !authToken.startsWith(expectedTokenPrefix)) {
            alert('Acesso não autorizado ou sessão expirada. Por favor, faça login.');
            let indexPath = 'index.html';
            if (window.location.pathname.includes('/IFCLABS/')) {
                indexPath = '/IFCLABS/index.html';
            }
            window.location.replace(indexPath);
            return;
        }
        const loggedInUser = sessionStorage.getItem('ifclabsUser');
        if (loggedInUser) {
            console.log('Usuário logado (simulado):', loggedInUser);
            const userGreetingElement = document.getElementById('user-greeting');
            if (userGreetingElement) {
                userGreetingElement.textContent = `Usuário: ${loggedInUser}`;
            }
        }
    }
    // --- Fim da Verificação de Token ---

    if (pathIsListaHtml) {
        const projectFolderNames = ["Duto_Rigido_001"];
        window.projectsData = {};
        window.currentProjectName = null; // Para saber qual projeto está ativo
        window.currentTabInfo = null;    // Para saber qual aba está ativa

        async function fetchProjectData(folderName) {
            try {
                const basePath = `./Project_Samples/${folderName}`;
                const noCache = `?v=${new Date().getTime()}`;

                const metadataResponse = await fetch(`<span class="math-inline">\{basePath\}/metadata\.json</span>{noCache}`);
                if (!metadataResponse.ok) throw new Error(`Falha ao carregar metadata.json para ${folderName} (Status: ${metadataResponse.status}) URL: ${metadataResponse.url}`);
                const metadata = await metadataResponse.json();

                const commentsResponse = await fetch(`<span class="math-inline">\{basePath\}/comments\.json</span>{noCache}`);
                if (!commentsResponse.ok) throw new Error(`Falha ao carregar comments.json para ${folderName} (Status: ${commentsResponse.status}) URL: ${commentsResponse.url}`);
                const comments = await commentsResponse.json();

                const tabsData = {};
                if (metadata.tabs && metadata.tabs.length > 0) {
                    for (const tabInfo of metadata.tabs) {
                        if (tabInfo.sourceFile) {
                            const csvResponse = await fetch(`<span class="math-inline">\{basePath\}/</span>{tabInfo.sourceFile}${noCache}`);
                            if (!csvResponse.ok) throw new Error(`Falha ao carregar ${tabInfo.sourceFile} para ${folderName} (Status: ${csvResponse.status}) URL: ${csvResponse.url}`);
                            // Armazenamos como texto, parsearemos depois para array de arrays
                            tabsData[tabInfo.sourceFile] = await csvResponse.text();
                        } else {
                            console.warn(`Aba "${tabInfo.name}" no metadata de ${folderName} não tem sourceFile definido.`);
                            tabsData[tabInfo.sourceFile || tabInfo.name] = "";
                        }
                    }
                }
                // Parseia os CSVs para arrays de arrays e armazena em uma nova propriedade
                const parsedTabsData = {};
                for (const key in tabsData) {
                    parsedTabsData[key] = parseCSV(tabsData[key]);
                }
                return { metadata, tabsData: parsedTabsData, comments }; // Armazena dados parseados
            } catch (error) {
                console.error(`Erro ao carregar dados para o projeto ${folderName}:`, error);
                // ... (código de tratamento de erro existente)
                return null;
            }
        }

        for (const folderName of projectFolderNames) {
            const data = await fetchProjectData(folderName);
            if (data) {
                window.projectsData[folderName] = data;
            }
        }

        if (Object.keys(window.projectsData).length > 0) {
            listProjects();
            const docViewer = document.getElementById('document-viewer');
            if(docViewer) docViewer.style.display = 'none';
        } else {
            // ... (código de tratamento de erro existente)
        }
    }
});

function listProjects() {
    // ... (código existente, sem alterações)
    const projectListDiv = document.getElementById('project-list');
    if (!projectListDiv || !window.projectsData) return;
    projectListDiv.innerHTML = '';

    Object.keys(window.projectsData).forEach(projectName => {
        const projectButton = document.createElement('button');
        projectButton.textContent = projectName;
        projectButton.onclick = (event) => {
            document.querySelectorAll('#project-list button.active').forEach(btn => btn.classList.remove('active'));
            event.currentTarget.classList.add('active');
            loadProject(projectName);
        }
        projectListDiv.appendChild(projectButton);
    });
}

function loadProject(projectName) {
    window.currentProjectName = projectName; // Define projeto ativo
    const project = window.projectsData[projectName];
    // ... (código existente para preencher metadados do documento, etc.)

    // Adicionar botão de Salvar/Download (inicialmente escondido ou desabilitado)
    const saveButtonContainer = document.getElementById('save-button-container'); // Você precisará criar este container no HTML
    if (saveButtonContainer) {
        saveButtonContainer.innerHTML = `<button id="save-changes-button">Baixar Arquivos Modificados</button>`;
        document.getElementById('save-changes-button').onclick = downloadModifiedFiles;
    }
    // ... (restante do código loadProject, como preencher metadados e comentários gerais)
    const docViewer = document.getElementById('document-viewer');
    if(docViewer) docViewer.style.display = 'block';

    const docTitle = document.getElementById('document-title');
    if(docTitle) docTitle.textContent = project.metadata.documentName || projectName;

    const metaCreatedBy = document.getElementById('meta-created-by');
    if(metaCreatedBy) metaCreatedBy.textContent = project.metadata.createdBy || 'N/A';
    const metaCreatedAt = document.getElementById('meta-created-at');
    if(metaCreatedAt) metaCreatedAt.textContent = project.metadata.createdAt ? new Date(project.metadata.createdAt).toLocaleString() : 'N/A';
    const metaLastModifiedBy = document.getElementById('meta-last-modified-by');
    if(metaLastModifiedBy) metaLastModifiedBy.textContent = project.metadata.lastModifiedBy || 'N/A';
    const metaLastModifiedAt = document.getElementById('meta-last-modified-at');
    if(metaLastModifiedAt) metaLastModifiedAt.textContent = project.metadata.lastModifiedAt ? new Date(project.metadata.lastModifiedAt).toLocaleString() : 'N/A';

    const docCommentsList = document.getElementById('doc-comments-list');
    if(docCommentsList) {
        docCommentsList.innerHTML = '';
        if (project.metadata.documentComments && project.metadata.documentComments.length > 0) {
            project.metadata.documentComments.forEach(comment => {
                const listItem = document.createElement('li');
                listItem.textContent = `(${comment.timestamp ? new Date(comment.timestamp).toLocaleTimeString() : 'N/A'}) ${comment.user}: ${comment.text}`;
                docCommentsList.appendChild(listItem);
            });
        } else {
            docCommentsList.innerHTML = '<li>Nenhum comentário geral para este documento.</li>';
        }
    }

    const tabButtonsDiv = document.getElementById('tab-buttons');
    if(!tabButtonsDiv) return;
    tabButtonsDiv.innerHTML = '';

    const currentTabNameEl = document.getElementById('current-tab-name');
    if(currentTabNameEl) currentTabNameEl.textContent = '';
    const dataTableContainer = document.getElementById('data-table-container');
    if(dataTableContainer) dataTableContainer.innerHTML = '';

    if (project.metadata.tabs && project.metadata.tabs.length > 0) {
        project.metadata.tabs.forEach((tabInfo, index) => {
            const tabButton = document.createElement('button');
            tabButton.textContent = tabInfo.name;
            tabButton.dataset.tabFile = tabInfo.sourceFile;

            tabButton.onclick = (event) => {
                document.querySelectorAll('#tab-buttons button.active').forEach(btn => btn.classList.remove('active'));
                event.currentTarget.classList.add('active');
                window.currentTabInfo = tabInfo; // Define aba ativa
                const tabDataArray = project.tabsData[tabInfo.sourceFile]; // Já deve ser array de arrays
                loadTabData(projectName, tabInfo, tabDataArray, project.comments);
            }
            tabButtonsDiv.appendChild(tabButton);

            if (index === 0) {
                tabButton.classList.add('active');
                window.currentTabInfo = tabInfo; // Define aba ativa
                const firstTabDataArray = project.tabsData[tabInfo.sourceFile];
                loadTabData(projectName, tabInfo, firstTabDataArray, project.comments);
            }
        });
    } else {
        if(currentTabNameEl) currentTabNameEl.textContent = 'Nenhuma aba definida para este documento.';
    }
}


function parseCSV(csvString) {
    if (typeof csvString !== 'string') {
        console.warn("parseCSV: input is not a string, returning empty array.", csvString);
        return [];
    }
    const lines = csvString.trim().split(/\r?\n/);
    return lines.map(line => {
        // TODO: Implementar um parser CSV mais robusto que lide com aspas e vírgulas dentro de campos
        return line.split(',');
    });
}

function loadTabData(projectName, tabInfo, dataRows, projectCellComments) { // dataRows agora é array de arrays
    const currentTabNameEl = document.getElementById('current-tab-name');
    if(currentTabNameEl) currentTabNameEl.textContent = `Dados da Aba: ${tabInfo.name}`;

    const dataTableContainer = document.getElementById('data-table-container');
    if(!dataTableContainer) return;
    dataTableContainer.innerHTML = ''; // Limpa antes de adicionar botões e tabela

    // Botões de Ação da Aba
    const actionButtonsDiv = document.createElement('div');
    actionButtonsDiv.className = 'tab-action-buttons';
    const addRowButton = document.createElement('button');
    addRowButton.textContent = 'Adicionar Linha';
    addRowButton.onclick = () => addRowToData(projectName, tabInfo.sourceFile);
    actionButtonsDiv.appendChild(addRowButton);
    // Adicionar mais botões aqui (ex: Adicionar Coluna, Remover Linha Selecionada)
    dataTableContainer.appendChild(actionButtonsDiv);


    if (!Array.isArray(dataRows)) {
        console.error("loadTabData: dataRows is not an array", dataRows);
        dataTableContainer.innerHTML += `<p>Erro ao carregar dados para a aba "${tabInfo.name}". Formato inesperado.</p>`;
        return;
    }

    const table = document.createElement('table');
    if (dataRows.length > 0) {
        const headerRow = table.createTHead().insertRow();
        const columnHeaders = dataRows[0].map(headerText => headerText.trim());
        columnHeaders.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });

        const tbody = table.createTBody();
        for (let i = 1; i < dataRows.length; i++) { // Começa em 1 para pular cabeçalho
            if (dataRows[i].join('').trim() === '') continue;

            const dataRowEl = tbody.insertRow();
            dataRowEl.dataset.rowIndex = i; // Armazena o índice original da linha nos dados
            const rowId = dataRows[i][0] ? dataRows[i][0].trim() : `generated-rowid-${i}`;

            dataRows[i].forEach((cellText, cellIndex) => {
                const cell = dataRowEl.insertCell();
                cell.textContent = cellText.trim();
                cell.setAttribute('contenteditable', 'true'); // <<< TORNA A CÉLULA EDITÁVEL
                cell.dataset.columnIndex = cellIndex; // Armazena o índice da coluna

                // Event listener para salvar alterações da célula
                cell.addEventListener('blur', (event) => { // 'blur' é quando a célula perde o foco
                    updateCellData(projectName, tabInfo.sourceFile, i, cellIndex, event.target.textContent);
                });

                // ... (código existente para destacar comentários)
                if (projectCellComments && projectCellComments.length > 0 && cellIndex < columnHeaders.length) {
                    const columnHeader = columnHeaders[cellIndex];
                    if (tabInfo && tabInfo.id && rowId && columnHeader) {
                        const hasComment = projectCellComments.some(commentPoint =>
                            commentPoint.tabId === tabInfo.id &&
                            commentPoint.cellCoordinates.rowId === rowId &&
                            commentPoint.cellCoordinates.columnHeader === columnHeader
                        );
                        if (hasComment) {
                            cell.classList.add('has-comment');
                            // ... (lógica de tooltip do comentário)
                            let commentDetails = "Comentários:\n";
                            projectCellComments.filter(c =>
                                c.tabId === tabInfo.id &&
                                c.cellCoordinates.rowId === rowId &&
                                c.cellCoordinates.columnHeader === columnHeader
                            ).forEach(cPoint => {
                                if (cPoint.threads) {
                                    cPoint.threads.forEach(thread => {
                                        if (thread.entries) {
                                            thread.entries.forEach(entry => {
                                                commentDetails += `- <span class="math-inline">\{entry\.user\} \(</span>{entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : 'N/A'}): <span class="math-inline">\{entry\.commentText\} \[</span>{entry.type}]\n`;
                                            });
                                        }
                                    });
                                }
                            });
                            cell.title = commentDetails;
                        }
                    }
                }
            });
            // Botão para remover linha
            const removeCell = dataRowEl.insertCell();
            const removeButton = document.createElement('button');
            removeButton.textContent = 'X';
            removeButton.className = 'remove-row-button';
            removeButton.title = 'Remover esta linha';
            removeButton.onclick = () => removeRowFromData(projectName, tabInfo.sourceFile, i);
            removeCell.appendChild(removeButton);
        }
    } else {
        dataTableContainer.innerHTML += "<p>Nenhum dado para exibir nesta aba (após o cabeçalho).</p>";
    }
    dataTableContainer.appendChild(table);
}

// Função para atualizar os dados em memória quando uma célula é editada
function updateCellData(projectName, sourceFile, rowIndex, columnIndex, newValue) {
    if (window.projectsData &&
        window.projectsData[projectName] &&
        window.projectsData[projectName].tabsData &&
        window.projectsData[projectName].tabsData[sourceFile] &&
        window.projectsData[projectName].tabsData[sourceFile][rowIndex] &&
        typeof window.projectsData[projectName].tabsData[sourceFile][rowIndex][columnIndex] !== 'undefined') {

        window.projectsData[projectName].tabsData[sourceFile][rowIndex][columnIndex] = newValue.trim();
        console.log(`Dado atualizado: Projeto ${projectName}, Aba ${sourceFile}, Linha ${rowIndex}, Coluna ${columnIndex}, Novo Valor: ${newValue.trim()}`);
        // TODO: Adicionar lógica para marcar o arquivo como "sujo" para salvar/download
    } else {
        console.error("Erro ao tentar atualizar célula: caminho de dados inválido.", {projectName, sourceFile, rowIndex, columnIndex});
    }
}

// Função para adicionar uma nova linha aos dados em memória e recarregar a tabela
function addRowToData(projectName, sourceFile) {
    const project = window.projectsData[projectName];
    if (project && project.tabsData && project.tabsData[sourceFile]) {
        const tabData = project.tabsData[sourceFile];
        const numCols = tabData.length > 0 ? tabData[0].length : 1; // Pega número de colunas do cabeçalho ou assume 1
        const newRow = Array(numCols).fill(''); // Cria linha vazia
        // Gerar um _RowID único para a nova linha
        newRow[0] = `uuid-row-id-<span class="math-inline">\{new Date\(\)\.getTime\(\)\}\-</span>{Math.random().toString(36).substr(2, 5)}`;
        tabData.push(newRow);

        // Recarrega a aba atual para mostrar a nova linha
        if (window.currentTabInfo && window.currentTabInfo.sourceFile === sourceFile) {
            loadTabData(projectName, window.currentTabInfo, tabData, project.comments);
        }
        console.log('Nova linha adicionada a:', sourceFile);
    }
}

// Função para remover uma linha dos dados em memória e recarregar a tabela
function removeRowFromData(projectName, sourceFile, rowIndexToRemove) {
    const project = window.projectsData[projectName];
    if (project && project.tabsData && project.tabsData[sourceFile]) {
        const tabData = project.tabsData[sourceFile];
        if (rowIndexToRemove > 0 && rowIndexToRemove < tabData.length) { // Não remove cabeçalho
            tabData.splice(rowIndexToRemove, 1); // Remove a linha

            // Recarrega a aba atual
            if (window.currentTabInfo && window.currentTabInfo.sourceFile === sourceFile) {
                loadTabData(projectName, window.currentTabInfo, tabData, project.comments);
            }
            console.log('Linha removida de:', sourceFile, 'índice:', rowIndexToRemove);
        }
    }
}

// Função para converter array de arrays de volta para string CSV
function convertArrayToCSV(dataArray) {
    return dataArray.map(row =>
        row.map(cell => {
            let cellString = String(cell);
            // Escapa aspas duplas e trata células com vírgulas ou quebras de linha
            if (cellString.includes('"') || cellString.includes(',') || cellString.includes('\n')) {
                cellString = '"' + cellString.replace(/"/g, '""') + '"';
            }
            return cellString;
        }).join(',')
    ).join('\r\n');
}


// Função para iniciar o download dos arquivos modificados
function downloadModifiedFiles() {
    if (!window.currentProjectName || !window.projectsData[window.currentProjectName]) {
        alert("Nenhum projeto carregado para salvar.");
        return;
    }
    const project = window.projectsData[window.currentProjectName];

    // 1. Download do metadata.json
    const metadataString = JSON.stringify(project.metadata, null, 2);
    downloadFile(metadataString, 'metadata.json', 'application/json');

    // 2. Download dos CSVs das abas
    for (const sourceFile in project.tabsData) {
        const csvString = convertArrayToCSV(project.tabsData[sourceFile]);
        downloadFile(csvString, sourceFile, 'text/csv');
    }

    // 3. Download do comments.json
    const commentsString = JSON.stringify(project.comments, null, 2);
    downloadFile(commentsString, 'comments.json', 'application/json');

    alert("Arquivos preparados para download. Verifique a pasta de downloads do seu navegador.");
}

function downloadFile(content, fileName, contentType) {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
}