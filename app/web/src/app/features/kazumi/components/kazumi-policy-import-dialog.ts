import {
  Component,
  computed,
  inject,
  input,
  model,
  output,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Button } from 'primeng/button'
import { Dialog } from 'primeng/dialog'
import { Divider } from 'primeng/divider'
import { IconField } from 'primeng/iconfield'
import { InputIcon } from 'primeng/inputicon'
import { InputTextModule } from 'primeng/inputtext'
import { KazumiService } from '../services/kazumi.service'

@Component({
  selector: 'da-kazumi-policy-import-dialog',
  imports: [
    Button,
    Divider,
    Dialog,
    FormsModule,
    InputTextModule,
    IconField,
    InputIcon,
  ],
  template: `
    <p-dialog [visible]="visible()"
              (visibleChange)="visibleChange.emit($event)" dismissableMask="true" modal="true"
              contentStyleClass="w-sm md:w-md lg:w-lg xl:w-xl" maskStyleClass="backdrop-blur-sm">
      <ng-template #header>
        <p-iconfield iconPosition="left">
          <p-inputicon styleClass="pi pi-search" />
          <input type="text" pInputText placeholder="过滤" [(ngModel)]="filter" />
        </p-iconfield>
      </ng-template>
      @if (manifest.isPending()) {
        <div class="flex justify-center items-center p-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      } @else if (manifest.isError()) {
        <div class="alert alert-error">
          <p>{{ manifest.error().message }}</p>
        </div>
      } @else if (!manifest.data()) {
        <div class="flex flex-col items-center justify-center p-8 text-center">
          <h3 class="text-lg font-medium mb-4">No policies found</h3>
          <p class="text-gray-500">No policies available in the repository.</p>
        </div>
      } @else {
        <ul>
          @for (manifest of manifests(); track manifest.name) {
            @let isImported = isPolicyImported(manifest.name);
            @let isImporting = inProgress().has(manifest.name);
            <li class="flex justify-between items-center p-4">
              <div>
                <div class="font-medium text-success">{{ manifest.name }}</div>
                <div class="text-sm dark:text-gray-500">{{ manifest.version }}</div>
              </div>
              <p-button
                [severity]="isImported ? 'secondary' : 'primary'"
                (click)="importPolicy.mutate(manifest.name)"
                [disabled]="isImported"
                [loading]="isImporting"
              >
                @if (isImported) {
                  ✓
                } @else {
                  导入
                }
              </p-button>
            </li>
            @if (!$last) {
              <p-divider></p-divider>
            }
          }
        </ul>
      }
    </p-dialog>
  `,
})
export class KazumiPolicyImportDialog {
  private kazumiService = inject(KazumiService)

  visible = input(false)
  visibleChange = output<boolean>()

  protected filter = model('')

  protected inProgress = this.kazumiService.$inProgressImports

  protected manifest = this.kazumiService.manifestsQuery
  protected locals = this.kazumiService.localPoliciesQuery

  protected importPolicy = this.kazumiService.addPolicyMutation

  protected manifests = computed(() => {
    return this.manifest.data()?.filter((m) => {
      return m.name
        .toLocaleLowerCase()
        .includes(this.filter().toLocaleLowerCase())
    })
  })

  protected isPolicyImported(name: string): boolean {
    if (this.locals.isSuccess()) {
      return this.locals.data().some((policy) => policy.name === name)
    }
    return false
  }
}
