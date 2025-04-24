<script>
    let { clan } = $props();
</script>

<style>
    #top {
        background-color: #f3edd8;
        border: 1px solid #62531d;
        border-radius: 5px;
        padding: 0.25rem;
    }

    table {
        width: 120px;
    }
</style>

<div id="top">
    <table>
        <tbody>
            <tr>
                <td colspan="3" style:color={clan.color} style:font-weight="bold" style:text-align="center">{clan.name}</td>
            </tr>
            <tr>
                <td>People</td>
                <td>{clan.size}</td>
                <td>({clan.lastSizeChange})</td>
            </tr>
            <tr>
                <td>QoL</td>
                <td>{clan.qol.toFixed()}</td>
                <td></td>
            </tr>
        </tbody>
    </table>
</div>