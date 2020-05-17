import {html, LitElement} from 'lit-element';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-dialog/paper-dialog.js';

/**
 * PolymerElement for management of projects.
 * TODO: Update Documentation when functionality of this element is final.
 * This element allows listing the projects that the current user is part of.
 * It also allows creating new projects, searching for existing ones, joining projects
 * and enter the modeling in a project.
 */
class ProjectExplorer extends LitElement {
  render() {
    return html`
      <style>
        .main {
          width: 100%;
          margin-top: 1em;
        }
        paper-button {
          color: rgb(240,248,255);
          background: rgb(30,144,255);
          max-height: 50px;
        }
        .button-create-project {
          margin-top: 0.5em;
          margin-bottom: 0.5em;
        }
        paper-button:hover {
          color: rgb(240,248,255);
          background: rgb(65,105,225);
        }
        .explorer-top-menu {
          display: flex;
          align-items: center;
        }
        .input-search-project {
          border-radius: 3px;
          border: thin solid #e1e1e1;
          margin-top: 0.5em;
          margin-bottom: 0.5em;
          margin-left: auto;
          height: 2.5em;
          padding-left:5px;
        }
        .project-item-card {
          display: flex;
          width: 100%;
          margin-top: 1em;
        }
        .project-item-card:hover {
          background: #eeeeee;
        }
        .project-item-card-content {
          width: 100%;
          height: 100%;
          align-items: center;
          display: flex;
        }
        .project-item-name {
          margin-left: 1em;
          margin-top: 1em;
          margin-bottom: 1em;
        }
        .project-item-user-list {
          margin: 1em 1em 1em 0.5em;
        }
        .green-dot {
          background-color: #c5e686;
          height: 0.8em;
          width: 0.8em;
          border-radius: 50%;
          display: inline-block;
          margin-left: auto;
        }
      </style>
      <div class="main">
        <div class="explorer-top-menu">
          <paper-button class="button-create-project" @click="${this._onCreateProjectButtonClicked}">Create Project</paper-button>
          <input class="input-search-project" placeholder="Search Projects"></input>
        </div>
        ${this.listedProjects.map(project => html`
            <paper-card class="project-item-card" @click="${() => this._onProjectItemClicked(project.id)}">
              <div class="project-item-card-content">
                <p class="project-item-name">${project.name}</p>
                ${this.getListOfProjectOnlineUsers(project.id) ? html`<span class="green-dot"></span>` : html``}
                <p class="project-item-user-list">${this.getListOfProjectOnlineUsers(project.id)}</p>
              </div>
            </paper-card>
        `)}
      </div>
      
      <!-- Dialog for creating new projects. -->
      <paper-dialog id="dialog-create-project">
        <h2>Create a Project</h2>
        
        <paper-input placeholder="Project Name"></paper-input>
        
        <div>
          <paper-button @click="${this._closeCreateProjectDialogClicked}">Cancel</paper-button>
          <paper-button>Create</paper-button>
        </div>
      </paper-dialog>
    `;
  }

  static get properties() {
    return {
      listedProjects: {
        type: Array
      }
    }
  }

  constructor() {
    super();
    this.listedProjects = [
      {
        "id": 1,
        "name": "Project 1"
      },
      {
        "id": 2,
        "name": "Project 2"
      },
      {
        "id": 3,
        "name": "Project 3"
      },
      {
        "id": 4,
        "name": "Project 4"
      }
    ];
  }

  // TODO: currently only for visualization of frontend without backend connection
  getProjectById(id) {
    return this.listedProjects.find(x => x.id == id);
  }

  /**
   * Gets called by the "Create Project" button.
   * Opens the dialog for creating a project, which then
   * lets the user select a name for the project that should
   * be created.
   * @private
   */
  _onCreateProjectButtonClicked() {
    this.shadowRoot.getElementById("dialog-create-project").open();
  }

  /**
   * Gets called when the user clicks on the
   * "Close" button in the create project dialog.
   * @private
   */
  _closeCreateProjectDialogClicked() {
    this.shadowRoot.getElementById("dialog-create-project").close();
  }

  /**
   * Gets called when the user clicks on a project in the project explorer.
   * Fires an event that notifies the parent element (ProjectManagement page)
   * that a project got selected.
   * From there it then gets send to the project user widget.
   * @param projectId Id of the project that got selected in the explorer.
   * @private
   */
  _onProjectItemClicked(projectId) {
    let event = new CustomEvent("project-selected-event", {
      detail: {
        message: "Selected project in project explorer.",
        project: this.getProjectById(projectId)
      }
    });
    this.dispatchEvent(event);
  }

  /**
   * TODO: check which users are really online in the project.
   * @param projectId
   */
  getListOfProjectOnlineUsers(projectId) {
    // only some test data for now
    if(projectId == 1) return "Alice, Bob";
    if(projectId == 2) return "Chris";
    else return undefined;
  }
}

customElements.define('project-explorer', ProjectExplorer);