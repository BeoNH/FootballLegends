# Inspector tooltip & JSDoc (portable)

Dùng khi copy skill sang project **chưa có** rule `.cursor/rules/cocos-inspector-docs.mdc`.

## Nguồn đầy đủ

Copy file `cocos-inspector-docs.mdc` từ project PingPong vào `.cursor/rules/` — đó là nguồn chính.

## Tóm tắt (khi chưa copy được rule)

- `@property({ type?, tooltip: '2–8 từ' })` — một dòng; `type` khi TS không suy ra được
- Tooltip số kèm đơn vị: `(s)`, `(px)`, `(%)`
- `readonly` khi field không gán lại sau `onLoad`; không `@property` cho state runtime
- JSDoc **một dòng** trên class/export util và method logic chính (phase, event handler, public API)
- Không `//` hoặc `/* */` trong thân method

```typescript
/** Điều phối luồng chính scene. */
@ccclass('SessionController')
export class SessionController extends Component {
    @property({ type: Node, tooltip: 'Node mục tiêu' })
    private readonly targetNode: Node | null = null;
}
```
